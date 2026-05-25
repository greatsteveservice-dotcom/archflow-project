-- ============================================================
-- 058: Raise per-bucket file_size_limit on moodboard-images and
-- broaden allowed_mime_types to cover iOS (HEIC/HEIF) and AVIF.
--
-- Context: migration 046 created the bucket with a hardcoded
-- 20 MB cap. This cap is independent of the global Storage
-- FILE_SIZE_LIMIT env (2 GB on the VM) and the nginx
-- client_max_body_size (2 GB on the VM), so users hit the
-- 20 MB wall even after those globals were raised.
-- ============================================================

UPDATE storage.buckets
SET
  file_size_limit = 104857600,  -- 100 MB
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/avif'
  ]
WHERE id = 'moodboard-images';
