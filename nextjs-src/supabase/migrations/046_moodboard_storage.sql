-- 046: Storage bucket for moodboard images (public for sharing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'moodboard-images',
  'moodboard-images',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (public bucket for shared moodboards)
CREATE POLICY "moodboard_images_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'moodboard-images');

-- Authenticated users can upload
CREATE POLICY "moodboard_images_auth_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'moodboard-images');

-- Authenticated users can delete their uploads
CREATE POLICY "moodboard_images_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'moodboard-images');
