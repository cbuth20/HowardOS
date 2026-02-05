-- =====================================================
-- ADD ONBOARDING TRACKING
-- Track whether users have completed initial onboarding
-- =====================================================

-- Add is_onboarded field to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;

-- Set existing users as already onboarded
UPDATE profiles
SET is_onboarded = true
WHERE created_at < NOW();

-- Add comment
COMMENT ON COLUMN profiles.is_onboarded IS 'Whether user has completed initial onboarding flow';
