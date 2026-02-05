-- =====================================================
-- ADD AVATARS TO TEST CLIENT ACCOUNTS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Update Target client with avatar
-- Using UI Avatars API for placeholder images
UPDATE profiles
SET
  avatar_url = 'https://ui-avatars.com/api/?name=Target+Team&size=200&background=CC0000&color=fff&bold=true',
  full_name = 'Target Team'
WHERE email = 'target-client@test.com';

-- Update Best Buy client with avatar
UPDATE profiles
SET
  avatar_url = 'https://ui-avatars.com/api/?name=Best+Buy&size=200&background=0046BE&color=FFF200&bold=true',
  full_name = 'Best Buy Team'
WHERE email = 'bestbuy-client@test.com';

-- Update Danielle Guizio client with avatar
UPDATE profiles
SET
  avatar_url = 'https://ui-avatars.com/api/?name=Danielle+Guizio&size=200&background=000000&color=ffffff&bold=true',
  full_name = 'Danielle Guizio'
WHERE email = 'danielle-client@test.com';

-- Verify the updates
SELECT
  email,
  full_name,
  avatar_url,
  role,
  organizations.name as org_name
FROM profiles
LEFT JOIN organizations ON profiles.org_id = organizations.id
WHERE email IN (
  'target-client@test.com',
  'bestbuy-client@test.com',
  'danielle-client@test.com'
)
ORDER BY email;

-- =====================================================
-- DONE! You should see 3 rows with avatar URLs
-- =====================================================
