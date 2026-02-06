-- Add dashboard_iframe_url to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dashboard_iframe_url TEXT;

-- Add comment
COMMENT ON COLUMN profiles.dashboard_iframe_url IS 'Custom iframe URL for client dashboard analytics';
