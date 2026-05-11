// One-shot migration: walk design_files where storage_provider='supabase',
// copy each object from the Supabase storage bucket on the Yandex VM into the
// public YC bucket (`archflow-design-prod`), update the row to point at the
// new public URL, and trigger thumbnail generation for it.
//
// Idempotent: re-running the script picks up only rows still on 'supabase'.
//
// Run:
//   cd nextjs-src
//   node --env-file=.env.local scripts/migrate-design-files-to-yc.mjs [--limit=N] [--dry-run]
//
// Notes:
//   - Designed to run in the background (screen / nohup); progress goes to
//     stdout, one line per file.
//   - Old objects are NOT deleted from Supabase storage by this script —
//     run a separate cleanup once everything's verified.

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import process from "node:process";

const argv = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [[m[1], m[2] ?? true]] : [];
  })
);
const LIMIT = Number(argv.limit) || 500;
const DRY = Boolean(argv["dry-run"]);

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YC_AKID = process.env.YC_S3_ACCESS_KEY_ID;
const YC_SK = process.env.YC_S3_SECRET_ACCESS_KEY;
const DESIGN_BUCKET = process.env.YC_DESIGN_BUCKET || "archflow-design-prod";
const DESIGN_CDN_HOST = process.env.YC_DESIGN_CDN_HOST || `${DESIGN_BUCKET}.storage.yandexcloud.net`;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || "";
const ORIGIN = process.env.ORIGIN || "https://archflow.ru";

if (!SUPA_URL || !SERVICE) throw new Error("Supabase env missing");
if (!YC_AKID || !YC_SK) throw new Error("YC S3 creds missing");

const sb = createClient(SUPA_URL, SERVICE);
const s3 = new S3Client({
  endpoint: "https://storage.yandexcloud.net",
  region: "ru-central1",
  credentials: { accessKeyId: YC_AKID, secretAccessKey: YC_SK },
  forcePathStyle: false,
});

function publicUrl(key) {
  return `https://${DESIGN_CDN_HOST}/${key}`;
}

async function downloadFromSupabase(path) {
  const { data, error } = await sb.storage.from("design-files").download(path);
  if (error) throw new Error(`download ${path}: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function migrateOne(row) {
  const { id, file_path: path, file_type: mime, name } = row;
  if (!path) {
    console.log(`[skip] ${id} — no file_path`);
    return false;
  }
  if (DRY) {
    console.log(`[dry] ${id} ${path} (${mime || "?"})`);
    return true;
  }
  // 1. Download original from Supabase storage
  const body = await downloadFromSupabase(path);
  // 2. Upload to YC bucket under the same key
  await s3.send(
    new PutObjectCommand({
      Bucket: DESIGN_BUCKET,
      Key: path,
      Body: body,
      ContentType: mime || "application/octet-stream",
      CacheControl: "public, max-age=2592000, immutable",
      ACL: "public-read",
    })
  );
  // 3. Update DB row: provider + url; reset thumb state so worker picks it up
  const newUrl = publicUrl(path);
  const thumbable = mime === "application/pdf" || (mime || "").startsWith("image/");
  await sb
    .from("design_files")
    .update({
      storage_provider: "yc",
      file_url: newUrl,
      thumb_status: thumbable ? "pending" : "unsupported",
    })
    .eq("id", id);
  // 4. Kick thumb generation (fire-and-forget)
  if (thumbable && INTERNAL_SECRET) {
    fetch(`${ORIGIN}/api/design/generate-thumb`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
      body: JSON.stringify({ fileId: id }),
    }).catch(() => {});
  }
  console.log(`[ok] ${id} ${path} → yc (${body.length} bytes) ${name || ""}`);
  return true;
}

(async () => {
  const { data: rows, error } = await sb
    .from("design_files")
    .select("id, file_path, file_type, name")
    .eq("storage_provider", "supabase")
    .limit(LIMIT);
  if (error) throw error;
  console.log(`migrating ${rows.length} rows (limit=${LIMIT}, dry=${DRY})`);
  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    try {
      const did = await migrateOne(row);
      if (did) ok++;
    } catch (e) {
      fail++;
      console.error(`[fail] ${row.id}:`, e.message);
    }
  }
  console.log(`done. ok=${ok} fail=${fail}`);
})();
