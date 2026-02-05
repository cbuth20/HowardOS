-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================

-- Create the files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false);

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Policy: Users can view files in their organization
CREATE POLICY "Users can view files in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'files' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.org_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Users can upload files to their organization folder
CREATE POLICY "Users can upload files to their org"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'files' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.org_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Users can update files they uploaded
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'files' AND
  owner::uuid = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.org_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Admins can delete any file in their org
CREATE POLICY "Admins can delete files in their org"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'files' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.org_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Users can delete files they uploaded
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'files' AND
  owner::uuid = auth.uid()
);
