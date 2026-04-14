-- ============================================================
-- 035: Create design-files storage bucket + RLS policies
-- The design_files TABLE was created in migration 018, but the
-- actual Supabase storage bucket was never created, so uploads
-- silently fail with an RLS/404 error.
-- ============================================================

-- 1. Create the bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-files',
  'design-files',
  true,
  52428800,  -- 50 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- 2. Allow authenticated users to upload files
CREATE POLICY "design_files_storage_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'design-files');

-- 3. Public read access (bucket is public)
CREATE POLICY "design_files_storage_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'design-files');

-- 4. Authenticated users can update (overwrite) files
CREATE POLICY "design_files_storage_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'design-files')
WITH CHECK (bucket_id = 'design-files');

-- 5. Authenticated users can delete files
CREATE POLICY "design_files_storage_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'design-files');
