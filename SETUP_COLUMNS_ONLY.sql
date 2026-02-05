-- =====================================================
-- USER MANAGEMENT COLUMNS SETUP
-- Run this if bucket creation via SQL fails
-- Create the bucket manually in Supabase Dashboard > Storage
-- =====================================================

-- Add avatar_url to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add logo_url to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add is_onboarded field to profiles
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

-- Verification
SELECT
  'avatar_url' as column_name,
  COUNT(*) as exists
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'avatar_url'
UNION ALL
SELECT
  'is_onboarded' as column_name,
  COUNT(*) as exists
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_onboarded'
UNION ALL
SELECT
  'logo_url' as column_name,
  COUNT(*) as exists
FROM information_schema.columns
WHERE table_name = 'organizations' AND column_name = 'logo_url';
