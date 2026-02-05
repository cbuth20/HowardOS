-- =====================================================
-- FIX STORAGE POLICIES FOR AVATARS BUCKET
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, delete any existing policies on storage.objects for avatars bucket
DELETE FROM storage.policies WHERE bucket_id = 'avatars';

-- Policy 1: Anyone can view/download avatars (public read)
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES (
  'Public read access for avatars',
  'avatars',
  'bucket_id = ''avatars''',
  'SELECT'
);

-- Policy 2: Authenticated users can upload to their own folder
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES (
  'Users can upload their own avatar',
  'avatars',
  '(bucket_id = ''avatars'') AND (auth.uid()::text = (storage.foldername(name))[1])',
  'INSERT'
);

-- Policy 3: Users can update their own avatar
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES (
  'Users can update their own avatar',
  'avatars',
  '(bucket_id = ''avatars'') AND (auth.uid()::text = (storage.foldername(name))[1])',
  'UPDATE'
);

-- Policy 4: Users can delete their own avatar
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES (
  'Users can delete their own avatar',
  'avatars',
  '(bucket_id = ''avatars'') AND (auth.uid()::text = (storage.foldername(name))[1])',
  'DELETE'
);

-- Policy 5: Admins can manage all avatars
INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES (
  'Admins can manage all avatars',
  'avatars',
  '(bucket_id = ''avatars'') AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
  'SELECT'
);

INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES (
  'Admins can upload any avatar',
  'avatars',
  '(bucket_id = ''avatars'') AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
  'INSERT'
);

INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES (
  'Admins can update any avatar',
  'avatars',
  '(bucket_id = ''avatars'') AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
  'UPDATE'
);

INSERT INTO storage.policies (name, bucket_id, definition, operation)
VALUES (
  'Admins can delete any avatar',
  'avatars',
  '(bucket_id = ''avatars'') AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
  'DELETE'
);

-- Verify policies were created
SELECT name, bucket_id, operation, definition
FROM storage.policies
WHERE bucket_id = 'avatars'
ORDER BY operation, name;

-- =====================================================
-- You should see 8 policies listed above
-- =====================================================
