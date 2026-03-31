-- Make feedback-screenshots bucket publicly readable
-- so Telegram links work without authentication

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to read files (public URL access)
CREATE POLICY IF NOT EXISTS "feedback_screenshots_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-screenshots');

-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "feedback_screenshots_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-screenshots');
