// One-shot: create YC Object Storage bucket archflow-design-prod and apply CORS.
// Used for the design-files migration off Supabase Storage onto YC + YC CDN.
// Run: cd nextjs-src && node scripts/setup-design-bucket.mjs
import {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();

const client = new S3Client({
  endpoint: "https://storage.yandexcloud.net",
  region: "ru-central1",
  credentials: {
    accessKeyId: get("YC_S3_ACCESS_KEY_ID"),
    secretAccessKey: get("YC_S3_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: false,
});

const Bucket = "archflow-design-prod";

// Step 1: ensure bucket exists. CreateBucket requires storage.admin (folder-level)
// which our service-account doesn't have — if it's missing, ask the user to
// create it in YC console.
let exists = false;
try {
  await client.send(new HeadBucketCommand({ Bucket }));
  exists = true;
  console.log(`[bucket] ${Bucket} already exists`);
} catch (e) {
  if (e.$metadata?.httpStatusCode === 404 || e.$metadata?.httpStatusCode === 403) {
    try {
      await client.send(new CreateBucketCommand({ Bucket, ACL: "public-read" }));
      console.log(`[bucket] created ${Bucket}`);
      exists = true;
    } catch (createErr) {
      console.error(`
[bucket] cannot create ${Bucket} — service account lacks storage.admin.

Please create the bucket manually in Yandex Cloud Console:
  https://console.yandex.cloud/folders/b1g10f7k5oev7f04d3pe/storage
  → Create bucket → name: ${Bucket}
  → access: Public ("Доступ на чтение объектов: Публичный")
  → max object size: 5 GB
  → region: ru-central1, storage class: Standard
Then re-run this script to apply CORS.
`);
      process.exit(1);
    }
  } else {
    console.error("HeadBucket unexpected error:", e.message);
    process.exit(1);
  }
}

// Step 2: CORS — same as media-prod but with archflow.ru origins
const cors = {
  CORSRules: [
    {
      AllowedOrigins: [
        "https://archflow.ru",
        "https://www.archflow.ru",
        "https://cdn.archflow.ru",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ],
      AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
      MaxAgeSeconds: 3000,
    },
  ],
};

await client.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: cors }));
const verify = await client.send(new GetBucketCorsCommand({ Bucket }));
console.log(`[cors] applied to ${Bucket}`);
console.log(JSON.stringify(verify.CORSRules, null, 2));
