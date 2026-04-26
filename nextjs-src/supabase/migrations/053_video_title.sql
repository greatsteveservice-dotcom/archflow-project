-- Add optional title to video reviews so author can rename them.
-- Display fallback: if NULL → "Видеообзор" + duration.

ALTER TABLE public.design_file_videos
  ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.design_file_videos.title IS
  'Optional human-readable name set by the author. Falls back to "Видеообзор" in UI when null.';
