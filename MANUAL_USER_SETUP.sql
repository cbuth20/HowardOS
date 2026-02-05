-- =====================================================
-- MANUAL TEST USER SETUP
-- Run this if auth signup is not working
-- =====================================================

-- Step 1: Create users directly in auth.users
-- Note: Supabase will hash the password automatically
-- Default password for all: DevTest123!

-- If you're using Supabase Cloud, you need to create users via the Dashboard:
-- Authentication > Users > Add User (Email: target-client@test.com, Password: DevTest123!)

-- For local Supabase, you can use these INSERT statements:

-- Target Client
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'target-client@test.com',
  crypt('DevTest123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Target Team"}',
  NOW(),
  NOW(),
  '',
  'authenticated',
  'authenticated'
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- After creating in auth.users, create profiles manually:

-- Get user IDs first
SELECT id, email FROM auth.users WHERE email IN (
  'target-client@test.com',
  'bestbuy-client@test.com',
  'danielle-client@test.com'
);

-- Then insert profiles (replace USER_IDs with actual IDs from above)
-- Target
INSERT INTO profiles (id, org_id, email, full_name, role, is_active)
VALUES (
  'REPLACE_WITH_TARGET_USER_ID',
  '10000000-0000-0000-0000-000000000001',
  'target-client@test.com',
  'Target Team',
  'client',
  true
)
ON CONFLICT (id) DO UPDATE
SET org_id = '10000000-0000-0000-0000-000000000001',
    role = 'client';

-- Best Buy
INSERT INTO profiles (id, org_id, email, full_name, role, is_active)
VALUES (
  'REPLACE_WITH_BESTBUY_USER_ID',
  '10000000-0000-0000-0000-000000000002',
  'bestbuy-client@test.com',
  'Best Buy Team',
  'client',
  true
)
ON CONFLICT (id) DO UPDATE
SET org_id = '10000000-0000-0000-0000-000000000002',
    role = 'client';

-- Danielle Guizio
INSERT INTO profiles (id, org_id, email, full_name, role, is_active)
VALUES (
  'REPLACE_WITH_DANIELLE_USER_ID',
  '10000000-0000-0000-0000-000000000003',
  'danielle-client@test.com',
  'Danielle Guizio',
  'client',
  true
)
ON CONFLICT (id) DO UPDATE
SET org_id = '10000000-0000-0000-0000-000000000003',
    role = 'client';
