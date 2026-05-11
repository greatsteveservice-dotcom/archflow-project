-- 056: design_files migration to Yandex Object Storage + thumbnails
--
-- Adds:
--   storage_provider — 'supabase' (legacy) | 'yc' (new uploads go here)
--   thumb_path       — path to generated thumbnail inside the YC bucket
--                      (server-rendered: PDF first page → JPEG 400px,
--                       image → resized webp 400px)
--   thumb_status     — pending | ready | failed | unsupported
--
-- Existing rows keep storage_provider='supabase' until the one-shot migration
-- script (scripts/migrate-design-files-to-yc.mjs) moves them.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='design_files' AND column_name='storage_provider'
  ) THEN
    ALTER TABLE design_files
      ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'supabase'
        CHECK (storage_provider IN ('supabase','yc'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='design_files' AND column_name='thumb_path'
  ) THEN
    ALTER TABLE design_files ADD COLUMN thumb_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='design_files' AND column_name='thumb_status'
  ) THEN
    ALTER TABLE design_files
      ADD COLUMN thumb_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (thumb_status IN ('pending','ready','failed','unsupported'));
  END IF;
END $$;

-- Index for the migration worker scanning rows that still live on Supabase
CREATE INDEX IF NOT EXISTS design_files_storage_provider_idx
  ON design_files (storage_provider)
  WHERE storage_provider = 'supabase';

-- Index for the thumb-generation worker scanning rows without thumbs yet
CREATE INDEX IF NOT EXISTS design_files_thumb_status_idx
  ON design_files (thumb_status)
  WHERE thumb_status = 'pending';

COMMIT;
