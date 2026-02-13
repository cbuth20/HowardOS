-- =====================================================
-- SECURE STORAGE: Separate logos bucket + private files bucket
-- Logos are public branding images; files are sensitive client documents
-- =====================================================

-- 1. Create public logos bucket (same pattern as avatars in migration 005)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies for logos bucket

-- Anyone can view logos (public branding)
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Admin/manager can upload logos
CREATE POLICY "Admin and managers can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Admin/manager can update logos
CREATE POLICY "Admin and managers can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Admin/manager can delete logos
CREATE POLICY "Admin and managers can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- 3. Make files bucket private (disable public access)
UPDATE storage.buckets
SET public = false
WHERE id = 'files';

-- 4. Rewrite existing logo_url values from files bucket to logos bucket
-- e.g. .../storage/v1/object/public/files/organizations/... → .../storage/v1/object/public/logos/organizations/...
UPDATE public.organizations
SET logo_url = REPLACE(logo_url, '/storage/v1/object/public/files/', '/storage/v1/object/public/logos/')
WHERE logo_url IS NOT NULL
AND logo_url LIKE '%/storage/v1/object/public/files/%';
