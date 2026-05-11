// POST /api/design/generate-thumb
// Body: { fileId }
// Internal endpoint — guarded by x-internal-secret header.
//
// Renders a 800px-wide JPEG thumbnail for a design file (PDF first page or
// raster image), uploads it to the same YC design bucket under
// <original_path>.thumb.jpg, and updates design_files.thumb_path/thumb_status.
//
// Pipeline (zero system dependencies — all pure npm):
//   PDF   → mupdf (WASM)  → PNG bytes → sharp (resize 800px) → JPEG q82
//   Image →                            sharp (resize 800px) → JPEG q82
// sharp ships prebuilt binaries for linux-x64-glibc / darwin-arm64 / etc, so
// `npm install` is enough on the VPS — no apt / sudo required.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3, DESIGN_BUCKET, designPublicUrl } from "@/app/lib/s3";
import sharp from "sharp";
// mupdf is dynamic-imported lazily inside the request handler — its top-level
// init throws during Next.js "Collecting page data" (CI build) because the
// WASM blob isn't loadable at static-analysis time.
type MupdfModule = typeof import("mupdf");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const THUMB_MAX = 800;

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

let _mupdfPromise: Promise<MupdfModule> | null = null;
function getMupdf(): Promise<MupdfModule> {
  if (!_mupdfPromise) _mupdfPromise = import("mupdf");
  return _mupdfPromise;
}

/** Render the first page of a PDF to a PNG buffer via MuPDF (WASM). */
async function renderPdfFirstPage(src: Buffer): Promise<Buffer> {
  const mupdf = await getMupdf();
  const doc = mupdf.Document.openDocument(src, "application/pdf");
  try {
    const page = doc.loadPage(0);
    try {
      // Scale 1.0 → native resolution. We let sharp downscale afterwards
      // (better resampling than MuPDF's bilinear scale).
      const matrix = mupdf.Matrix.scale(1.0, 1.0);
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
      try {
        return Buffer.from(pixmap.asPNG());
      } finally {
        if (typeof (pixmap as { destroy?: () => void }).destroy === "function") {
          (pixmap as { destroy: () => void }).destroy();
        }
      }
    } finally {
      if (typeof (page as { destroy?: () => void }).destroy === "function") {
        (page as { destroy: () => void }).destroy();
      }
    }
  } finally {
    if (typeof (doc as { destroy?: () => void }).destroy === "function") {
      (doc as { destroy: () => void }).destroy();
    }
  }
}

async function makeThumb(src: Buffer, mime: string): Promise<Buffer> {
  let rasterSrc = src;
  if (mime === "application/pdf") {
    rasterSrc = await renderPdfFirstPage(src);
  } else if (!mime.startsWith("image/")) {
    throw new Error(`unsupported mime: ${mime}`);
  }
  return await sharp(rasterSrc)
    .rotate() // honor EXIF orientation for images; no-op for PNG from mupdf
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
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
      thumbBuf = await makeThumb(src, f.file_type);
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
