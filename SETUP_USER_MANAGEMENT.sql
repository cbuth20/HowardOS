-- =====================================================
-- COMPLETE USER MANAGEMENT SETUP
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Step 1: Add avatar_url to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Add logo_url to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Step 3: Add is_onboarded field to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;

-- Set existing users as already onboarded (so they don't see welcome modal)
UPDATE profiles
SET is_onboarded = true
WHERE created_at < NOW();

-- Add comments
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture in storage';
COMMENT ON COLUMN organizations.logo_url IS 'URL to organization logo in storage';
COMMENT ON COLUMN profiles.is_onboarded IS 'Whether user has completed initial onboarding flow';

-- Step 4: Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Storage policies for avatars bucket

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage org avatars" ON storage.objects;

-- Allow everyone to view avatars (public access)
CREATE POLICY "Users can view all avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to manage all avatars in their org
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

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify everything is set up correctly
-- =====================================================

-- Check if columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('avatar_url', 'is_onboarded');

-- Check if bucket was created
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'avatars';

-- Check if policies were created
SELECT policyname
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%avatar%';

-- =====================================================
-- SUCCESS!
-- If all verification queries return results, you're ready to go
-- =====================================================
