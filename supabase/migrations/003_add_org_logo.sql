-- Add logo_url to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment
COMMENT ON COLUMN organizations.logo_url IS 'URL to organization logo/avatar image';
