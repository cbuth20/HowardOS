-- =====================================================
-- ADD AVATAR AND LOGO SUPPORT
-- Adds profile picture and company logo functionality
-- =====================================================

-- Add avatar_url to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add logo_url to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Users can view all avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can manage all avatars in their org
CREATE POLICY "Admins can manage org avatars"
ON storage.objects FOR ALL
USING (
  bucket_id = 'avatars' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add comments
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture in storage';
COMMENT ON COLUMN organizations.logo_url IS 'URL to organization logo in storage';
