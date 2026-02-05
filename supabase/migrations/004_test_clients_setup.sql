-- =====================================================
-- TEST CLIENTS SETUP
-- Target, Best Buy, Danielle Guizio
-- =====================================================

-- Create Organizations
INSERT INTO organizations (id, name, slug, logo_url) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Target', 'target', 'https://logo.clearbit.com/target.com'),
  ('10000000-0000-0000-0000-000000000002', 'Best Buy', 'best-buy', 'https://logo.clearbit.com/bestbuy.com'),
  ('10000000-0000-0000-0000-000000000003', 'Danielle Guizio', 'danielle-guizio', 'https://danielleguiziony.com/favicon.ico')
ON CONFLICT (id) DO NOTHING;

-- Create Test Client Users
-- Note: These need actual auth.users entries first, but we'll prepare the profiles

-- For testing, you'll need to sign up with these emails, then run the updates below

-- Test user emails (sign up with these):
-- target-client@test.com
-- bestbuy-client@test.com
-- danielle-client@test.com

-- After signup, update profiles with this:
-- (Replace USER_IDs with actual IDs from auth.users after signup)

/*
-- Target Client
UPDATE profiles
SET org_id = '10000000-0000-0000-0000-000000000001',
    role = 'client',
    full_name = 'Target Team'
WHERE email = 'target-client@test.com';

-- Best Buy Client
UPDATE profiles
SET org_id = '10000000-0000-0000-0000-000000000002',
    role = 'client',
    full_name = 'Best Buy Team'
WHERE email = 'bestbuy-client@test.com';

-- Danielle Guizio Client
UPDATE profiles
SET org_id = '10000000-0000-0000-0000-000000000003',
    role = 'client',
    full_name = 'Danielle Guizio'
WHERE email = 'danielle-client@test.com';
*/

-- =====================================================
-- FILE ASSIGNMENT SYSTEM
-- Add a way to assign files to specific clients
-- =====================================================

-- Add assigned_to column to files table (optional - for direct assignment)
ALTER TABLE files
ADD COLUMN IF NOT EXISTS assigned_to_user UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_files_assigned_to ON files(assigned_to_user);

-- Comment: file_permissions table already exists for granular sharing
-- We can use it to share files with specific users

-- =====================================================
-- HELPER VIEW: Client Files
-- Makes it easy to query files visible to a client
-- =====================================================

CREATE OR REPLACE VIEW client_accessible_files AS
SELECT DISTINCT
  f.*,
  CASE
    WHEN f.assigned_to_user IS NOT NULL THEN 'assigned'
    WHEN fp.id IS NOT NULL THEN 'shared'
    ELSE 'owned'
  END as access_type
FROM files f
LEFT JOIN file_permissions fp ON f.id = fp.file_id
WHERE
  -- Files uploaded by the user
  f.uploaded_by = auth.uid()
  OR
  -- Files assigned to the user
  f.assigned_to_user = auth.uid()
  OR
  -- Files shared via permissions
  fp.user_id = auth.uid();

-- =====================================================
-- QUICK LOGIN HELPER (DEV ONLY)
-- View to see all test accounts
-- =====================================================

CREATE OR REPLACE VIEW dev_test_accounts AS
SELECT
  p.id as user_id,
  p.email,
  p.full_name,
  p.role,
  o.name as organization,
  o.slug as org_slug
FROM profiles p
JOIN organizations o ON p.org_id = o.id
WHERE p.email LIKE '%@test.com'
ORDER BY o.name, p.role DESC;
