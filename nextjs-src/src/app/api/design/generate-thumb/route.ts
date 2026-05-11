// POST /api/design/generate-thumb
// Body: { fileId }
// Internal endpoint — guarded by x-internal-secret header.
//
// Renders a 400px-wide JPEG thumbnail for a design file (PDF first page or
// raster image), uploads it back into the same YC design bucket under
// <original_path>.thumb.jpg, and updates design_files.thumb_path/thumb_status.
//
// Uses puppeteer-core + @sparticuz/chromium (already in deps, no extra binary
// installs needed). Chrome handles both PDF native preview and image resize.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3, DESIGN_BUCKET, designPublicUrl } from "@/app/lib/s3";
import puppeteer, { Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const THUMB_WIDTH = 800; // 2x density for retina, displayed at 400px CSS

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = await chromium.executablePath();
  return puppeteer.launch({
    args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
    executablePath,
    headless: true,
  });
}

/** Take a JPEG buffer of width THUMB_WIDTH for the given file URL. */
async function renderThumb(url: string, mime: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    if (mime === "application/pdf") {
      // Chrome opens PDFs in its native viewer. Set viewport to A4 aspect at
      // 2× density; the viewer fills the viewport with page 1.
      await page.setViewport({ width: THUMB_WIDTH, height: Math.round(THUMB_WIDTH * 1.414) });
      await page.goto(url, { waitUntil: "networkidle0", timeout: 45_000 });
      // Wait one rAF so the PDF viewer's first page finishes painting.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
      const buf = await page.screenshot({ type: "jpeg", quality: 78, fullPage: false });
      return Buffer.from(buf);
    }
    // Image: open raw URL, viewport sized to image with cap on width
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
    const dim = await page.evaluate(() => {
      const img = document.querySelector("img");
      if (img) return { w: img.naturalWidth, h: img.naturalHeight };
      return null;
    });
    if (!dim) throw new Error("no <img> in page (unexpected MIME)");
    const w = Math.min(THUMB_WIDTH, dim.w);
    const h = Math.round((w / dim.w) * dim.h);
    await page.setViewport({ width: w, height: h });
    await page.evaluate((width: number) => {
      const img = document.querySelector("img") as HTMLImageElement | null;
      if (img) {
        img.style.width = `${width}px`;
        img.style.height = "auto";
        document.body.style.margin = "0";
      }
    }, w);
    const buf = await page.screenshot({ type: "jpeg", quality: 80, fullPage: false });
    return Buffer.from(buf);
  } finally {
    await browser.close().catch(() => {});
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

    // Generate
    const url = f.storage_provider === "yc" ? designPublicUrl(f.file_path) : f.file_url;
    let thumbBuf: Buffer;
    try {
      thumbBuf = await renderThumb(url, f.file_type);
    } catch (renderErr) {
      console.error("[design/thumb] render failed:", renderErr);
      await sb
        .from("design_files")
        .update({ thumb_status: "failed" })
        .eq("id", fileId);
      return NextResponse.json({ error: "render failed" }, { status: 500 });
    }

    // Upload alongside the original
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

    return NextResponse.json({ ok: true, thumb_path: thumbKey, thumb_url: designPublicUrl(thumbKey) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[design/generate-thumb]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
