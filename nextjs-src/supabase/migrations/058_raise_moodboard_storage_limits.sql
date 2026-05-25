-- 058: Raise per-bucket file_size_limit on moodboard-images and add HEIC/HEIF/AVIF.
--
-- Why: migration 046 set file_size_limit = 20 MB on the moodboard-images bucket.
-- Supabase Storage per-bucket limit overrides the global FILE_SIZE_LIMIT, so
-- raising the global limit on the VM had no effect on this bucket — users hit
-- 20 MB even after the "увеличили объём" change. Bump it to 100 MB and accept
-- HEIC/HEIF/AVIF so iPhone photos don't get rejected by MIME.

UPDATE storage.buckets
SET
  file_size_limit = 104857600, -- 100 MB
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
