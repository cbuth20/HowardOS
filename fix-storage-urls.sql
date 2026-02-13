-- Quick fix: Convert existing storage URLs to proxy format
-- Run this in Supabase SQL Editor

-- Convert avatar URLs
UPDATE public.profiles
SET avatar_url = '/api/storage-avatar?path=' ||
  regexp_replace(avatar_url, '^.*/storage/v1/object/public/avatars/', '')
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE '%/storage/v1/object/public/avatars/%';

-- Convert logo URLs
UPDATE public.organizations
SET logo_url = '/api/storage-logo?path=' ||
  regexp_replace(logo_url, '^.*/storage/v1/object/public/logos/', '')
WHERE logo_url IS NOT NULL
  AND logo_url LIKE '%/storage/v1/object/public/logos/%';

-- Check results
SELECT id, email, avatar_url FROM profiles WHERE avatar_url IS NOT NULL LIMIT 5;
SELECT id, name, logo_url FROM organizations WHERE logo_url IS NOT NULL LIMIT 5;
