// Yandex Object Storage client (S3-совместимый).
//
// Lazy-init: клиент создаётся при первом использовании, чтобы CI build не падал
// если ENV не выставлены на стадии "Collecting page data" (см. CLAUDE.md).
//
// Endpoint: https://storage.yandexcloud.net (фиксированный для всех YC бакетов)
// Region: ru-central1
//
// Бакет: archflow-media-prod (приватный, доступ через presigned URLs)

import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const ENDPOINT = "https://storage.yandexcloud.net";
const REGION = "ru-central1";
export const MEDIA_BUCKET = "archflow-media-prod";

let _client: S3Client | null = null;

export function getS3(): S3Client {
  if (_client) return _client;
  const accessKeyId = process.env.YC_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.YC_S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("YC_S3_ACCESS_KEY_ID / YC_S3_SECRET_ACCESS_KEY not set");
  }
  _client = new S3Client({
    endpoint: ENDPOINT,
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false, // virtual-hosted style: bucket.storage.yandexcloud.net
  });
  return _client;
}

// PUT presigned URL — для прямой загрузки файла из браузера в бакет.
// TTL 10 минут — достаточно чтобы поднять видео 30-50 МБ.
export async function getUploadUrl(
  key: string,
  contentType: string,
  bucket: string = MEDIA_BUCKET
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3(), cmd, { expiresIn: 600 });
}

// GET presigned URL — для просмотра/скачивания.
// TTL 15 минут — клиент успеет проиграть видео без перегенерации.
export async function getReadUrl(
  key: string,
  bucket: string = MEDIA_BUCKET
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(getS3(), cmd, { expiresIn: 900 });
}

export async function deleteObject(key: string, bucket: string = MEDIA_BUCKET): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
