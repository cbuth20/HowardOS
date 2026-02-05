-- HowardOS Development Seed Data
-- Create sample organization, users, files, and tasks for testing

-- =====================================================
-- ORGANIZATIONS
-- =====================================================

-- Sample organization: Howard Consulting
INSERT INTO organizations (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Howard Consulting',
  'howard-consulting',
  '{"timezone": "America/New_York", "date_format": "MM/DD/YYYY"}'
);

-- =====================================================
-- PROFILES
-- =====================================================
-- Note: These profiles will be created after users sign up
-- The auth.users entries must exist first via Supabase Auth
-- This is reference data for manual testing

-- Admin User Example (create this via sign-up flow)
-- Email: admin@howardconsulting.com
-- Role: admin
-- Org: Howard Consulting

-- INSERT INTO profiles (id, org_id, email, full_name, role)
-- VALUES (
--   'user-uuid-from-auth-users',
--   '00000000-0000-0000-0000-000000000001',
--   'admin@howardconsulting.com',
--   'Admin User',
--   'admin'
-- );

-- Client User Example (create via sign-up flow)
-- Email: client@example.com
-- Role: client
-- Org: Howard Consulting

-- =====================================================
-- SAMPLE FILES (if profiles exist)
-- =====================================================
-- Uncomment and update after creating test users

-- INSERT INTO files (id, org_id, name, size, mime_type, storage_path, folder_path, uploaded_by)
-- VALUES (
--   '10000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000001',
--   'Project Proposal.pdf',
--   1024000,
--   'application/pdf',
--   '00000000-0000-0000-0000-000000000001/documents/project-proposal.pdf',
--   '/documents',
--   'admin-user-uuid'
-- );

-- INSERT INTO files (id, org_id, name, size, mime_type, storage_path, folder_path, uploaded_by)
-- VALUES (
--   '10000000-0000-0000-0000-000000000002',
--   '00000000-0000-0000-0000-000000000001',
--   'Q4 Report.xlsx',
--   512000,
--   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
--   '00000000-0000-0000-0000-000000000001/reports/q4-report.xlsx',
--   '/reports',
--   'admin-user-uuid'
-- );

-- =====================================================
-- SAMPLE TASKS
-- =====================================================
-- Uncomment and update after creating test users

-- INSERT INTO tasks (id, org_id, title, description, status, priority, created_by, due_date)
-- VALUES (
--   '20000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000001',
--   'Review project proposal',
--   'Please review the attached project proposal and provide feedback',
--   'pending',
--   'high',
--   'admin-user-uuid',
--   NOW() + INTERVAL '7 days'
-- );

-- INSERT INTO tasks (id, org_id, title, description, status, priority, created_by, assigned_to, due_date)
-- VALUES (
--   '20000000-0000-0000-0000-000000000002',
--   '00000000-0000-0000-0000-000000000001',
--   'Complete client onboarding',
--   'Finish all onboarding steps for the new client',
--   'in_progress',
--   'medium',
--   'admin-user-uuid',
--   'admin-user-uuid',
--   NOW() + INTERVAL '3 days'
-- );

-- =====================================================
-- INSTRUCTIONS FOR MANUAL TESTING
-- =====================================================
-- 1. Sign up two users via the application:
--    - admin@howardconsulting.com (set role to 'admin' in profiles table)
--    - client@example.com (set role to 'client' in profiles table)
--
-- 2. Update the profile records to link them to the Howard Consulting org:
--    UPDATE profiles SET org_id = '00000000-0000-0000-0000-000000000001'
--    WHERE email IN ('admin@howardconsulting.com', 'client@example.com');
--
-- 3. Uncomment and update the sample files and tasks above with actual user UUIDs
--
-- 4. Test RLS by logging in as different users and verifying:
--    - Users can only see data from their org
--    - Admins have broader permissions
--    - Clients have restricted access
