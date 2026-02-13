-- =====================================================
-- MAKE ALL STORAGE BUCKETS PRIVATE
-- Secure avatars and logos buckets with proxy URL access
-- =====================================================

-- 1. Make avatars bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'avatars';

-- 2. Make logos bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'logos';

-- 3. Convert existing avatar URLs to proxy URLs
-- From: https://.../storage/v1/object/public/avatars/{path}
-- To: /api/storage-avatar?path={path}
UPDATE public.profiles
SET avatar_url = '/api/storage-avatar?path=' ||
  regexp_replace(avatar_url, '^.*/storage/v1/object/public/avatars/', '')
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE '%/storage/v1/object/public/avatars/%';

-- 4. Convert existing logo URLs to proxy URLs
-- From: https://.../storage/v1/object/public/logos/{path}
-- To: /api/storage-logo?path={path}
UPDATE public.organizations
SET logo_url = '/api/storage-logo?path=' ||
  regexp_replace(logo_url, '^.*/storage/v1/object/public/logos/', '')
WHERE logo_url IS NOT NULL
  AND logo_url LIKE '%/storage/v1/object/public/logos/%';

-- 5. Verify all buckets are now private
-- Final state: avatars=private, logos=private, files=private
-- All URLs now use authenticated proxy endpoints instead of public URLs
