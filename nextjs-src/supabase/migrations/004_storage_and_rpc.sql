-- ============================================================
-- Migration 004: Storage bucket for photos + lookup RPC
-- ============================================================

-- Create storage bucket for photo uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Auth users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Allow public read access to photos
CREATE POLICY "Public can read photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Allow authenticated users to update their photos
CREATE POLICY "Auth users can update photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- RPC function to look up user by email (bypasses RLS on profiles)
-- Needed for invite functionality where the invitee is not yet a project member
CREATE OR REPLACE FUNCTION lookup_profile_by_email(target_email TEXT)
RETURNS TABLE(id UUID, full_name TEXT)
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT id, full_name FROM profiles WHERE email = target_email LIMIT 1;
$$;
