-- 058: Raise moodboard-images bucket limit to 100 MB + accept HEIC/HEIF/AVIF.
-- Why: migration 046 set per-bucket file_size_limit = 20 MB on moodboard-images.
-- Per-bucket overrides the global FILE_SIZE_LIMIT (2 GB on VM), so raising the
-- global had no effect on this bucket. Users hit 20 MB ceiling on iPhone photos.
UPDATE storage.buckets
SET file_size_limit = 104857600,
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
