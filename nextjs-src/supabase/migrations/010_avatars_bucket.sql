-- Migration 010: Storage bucket for user avatars

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own avatar
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Anyone can view avatars (public bucket)
CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can update their own avatar
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
