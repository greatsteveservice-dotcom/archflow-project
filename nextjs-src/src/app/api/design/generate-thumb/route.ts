// POST /api/design/generate-thumb
// Body: { fileId }
// Internal endpoint — guarded by x-internal-secret header.
//
// Renders a 800px-wide JPEG thumbnail for a design file (PDF first page or
// raster image), uploads it to the same YC design bucket under
// <original_path>.thumb.jpg, and updates design_files.thumb_path/thumb_status.
//
// Uses native CLI tools for speed and reliability:
//   PDF   → pdftoppm  (apt: poppler-utils)
//   Image → convert   (apt: imagemagick)
// Both are vastly faster than headless Chromium (~0.5 sec vs 5+ sec cold start)
// and avoid the PDFium-plugin issue that @sparticuz/chromium has.
//
// VPS prerequisite: `sudo apt install -y poppler-utils imagemagick`

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3, DESIGN_BUCKET, designPublicUrl } from "@/app/lib/s3";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execAsync = promisify(exec);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function fetchSource(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`source fetch ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function renderThumb(src: Buffer, mime: string): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "af-thumb-"));
  try {
    const srcPath = path.join(dir, "src");
    await writeFile(srcPath, src);

    if (mime === "application/pdf") {
      // pdftoppm: first page only (-f 1 -l 1), JPEG, longest side 800 px.
      // Output goes to <prefix>-1.jpg
      const prefix = path.join(dir, "out");
      await execAsync(
        `pdftoppm -jpeg -jpegopt quality=80 -scale-to 800 -f 1 -l 1 "${srcPath}" "${prefix}"`,
        { timeout: 30_000 }
      );
      return await readFile(`${prefix}-1.jpg`);
    }

    if (mime.startsWith("image/")) {
      const outPath = path.join(dir, "out.jpg");
      // -resize 800x800\>: downscale only if larger; preserve aspect ratio.
      // -auto-orient: respect EXIF orientation.
      await execAsync(
        `convert "${srcPath}" -auto-orient -resize 800x800\\> -quality 82 "${outPath}"`,
        { timeout: 30_000 }
      );
      return await readFile(outPath);
    }

    throw new Error(`unsupported mime: ${mime}`);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret") || "";
  const expected = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileId } = await req.json();
    if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

    const sb = getServiceClient();
    const { data: file, error } = await sb
      .from("design_files")
      .select("id, file_path, file_url, file_type, storage_provider")
      .eq("id", fileId)
      .single();
    if (error || !file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const f = file as {
      id: string;
      file_path: string;
      file_url: string;
      file_type: string;
      storage_provider: string;
    };

    const url = f.storage_provider === "yc" ? designPublicUrl(f.file_path) : f.file_url;

    let thumbBuf: Buffer;
    try {
      const src = await fetchSource(url);
      thumbBuf = await renderThumb(src, f.file_type);
    } catch (renderErr) {
      console.error("[design/thumb] render failed:", renderErr);
      await sb.from("design_files").update({ thumb_status: "failed" }).eq("id", fileId);
      return NextResponse.json({ error: "render failed" }, { status: 500 });
    }

    const thumbKey = `${f.file_path}.thumb.jpg`;
    await getS3().send(
      new PutObjectCommand({
        Bucket: DESIGN_BUCKET,
        Key: thumbKey,
        Body: thumbBuf,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=2592000, immutable",
        ACL: "public-read",
      })
    );

    await sb
      .from("design_files")
      .update({ thumb_path: thumbKey, thumb_status: "ready" })
      .eq("id", fileId);

    return NextResponse.json({
      ok: true,
      thumb_path: thumbKey,
      thumb_url: designPublicUrl(thumbKey),
      bytes: thumbBuf.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[design/generate-thumb]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
