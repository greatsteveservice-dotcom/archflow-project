// One-shot: apply CORS policy to YC Object Storage bucket archflow-media-prod
// Run: cd nextjs-src && node /tmp/apply-cors.mjs
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
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

const Bucket = "archflow-media-prod";

const cors = {
  CORSRules: [
    {
      AllowedOrigins: [
        "https://archflow.ru",
        "https://www.archflow.ru",
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
console.log("CORS applied. Verifying...");
const verify = await client.send(new GetBucketCorsCommand({ Bucket }));
console.log(JSON.stringify(verify.CORSRules, null, 2));
