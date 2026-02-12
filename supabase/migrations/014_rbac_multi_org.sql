-- =====================================================
-- RBAC + Multi-Org Foundation
-- Expands role system from 2 roles (admin/client) to 5 roles
-- Adds user_organizations join table for multi-org membership
-- =====================================================

-- =====================================================
-- STEP 1: Create user_organizations join table
-- Enables users to belong to multiple organizations
-- =====================================================

CREATE TABLE user_organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON user_organizations(org_id);
CREATE INDEX idx_user_organizations_primary ON user_organizations(user_id, is_primary) WHERE is_primary = true;

-- =====================================================
-- STEP 2: Expand role enum on profiles table
-- New roles: admin, manager, user, client, client_no_access
-- =====================================================

-- Drop the existing CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- The original constraint was inline: CHECK (role IN ('admin', 'client'))
-- PostgreSQL names inline constraints as "<table>_<column>_check"
-- Drop by the generated name just in case
DO $$
BEGIN
  -- Try to drop the unnamed inline constraint by querying pg_constraint
  EXECUTE (
    SELECT 'ALTER TABLE profiles DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%'
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No additional role constraint found to drop';
END $$;

-- Add new constraint with expanded roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'user', 'client', 'client_no_access'));

-- =====================================================
-- STEP 3: Add allowed_org_ids for 'user' role
-- Team users with 'user' role can be restricted to specific client orgs
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_org_ids UUID[] DEFAULT '{}';

-- =====================================================
-- STEP 4: Update file_permissions role column
-- =====================================================

ALTER TABLE file_permissions DROP CONSTRAINT IF EXISTS file_permissions_role_check;

-- Drop inline constraint if it exists under a different name
DO $$
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE file_permissions DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'file_permissions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%'
      AND pg_get_constraintdef(oid) NOT LIKE '%user_id%'
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No file_permissions role constraint found to drop';
END $$;

-- =====================================================
-- STEP 5: Migrate existing data to user_organizations
-- Each profile with an org_id gets a row in user_organizations
-- =====================================================

INSERT INTO user_organizations (user_id, org_id, is_primary)
SELECT id, org_id, true
FROM profiles
WHERE org_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

-- =====================================================
-- STEP 6: New RLS helper functions
-- =====================================================

-- Get all org IDs a user belongs to (via user_organizations)
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    array_agg(org_id),
    ARRAY[]::UUID[]
  )
  FROM public.user_organizations
  WHERE user_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user is a team member (admin, manager, or user)
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager', 'user')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if current user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get allowed_org_ids for 'user' role (empty = all orgs)
CREATE OR REPLACE FUNCTION public.get_allowed_org_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(allowed_org_ids, ARRAY[]::UUID[])
  FROM public.profiles
  WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user can see a specific org_id based on role + restrictions
CREATE OR REPLACE FUNCTION public.can_access_org(target_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_allowed UUID[];
  user_org_ids UUID[];
BEGIN
  SELECT role, COALESCE(allowed_org_ids, ARRAY[]::UUID[])
  INTO user_role, user_allowed
  FROM public.profiles
  WHERE id = auth.uid();

  -- admin and manager can access everything
  IF user_role IN ('admin', 'manager') THEN
    RETURN true;
  END IF;

  -- 'user' role: check allowed_org_ids (empty means all)
  IF user_role = 'user' THEN
    IF array_length(user_allowed, 1) IS NULL OR array_length(user_allowed, 1) = 0 THEN
      RETURN true;
    END IF;
    RETURN target_org_id = ANY(user_allowed);
  END IF;

  -- client: check user_organizations membership
  IF user_role = 'client' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE user_id = auth.uid()
      AND org_id = target_org_id
    );
  END IF;

  -- client_no_access: never
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- STEP 7: Update auto-create profile trigger
-- Default new signups to 'client' role (unchanged behavior)
-- Also create user_organizations entry
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_org_id UUID;
  user_role TEXT;
BEGIN
  -- Get role and org_id from metadata if provided (set during invite flow)
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  user_org_id := (NEW.raw_user_meta_data->>'org_id')::UUID;

  INSERT INTO public.profiles (id, email, full_name, role, org_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role,
    user_org_id,
    true
  );

  -- Also create user_organizations entry if org_id is provided
  IF user_org_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, org_id, is_primary)
    VALUES (NEW.id, user_org_id, true)
    ON CONFLICT (user_id, org_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: RLS for user_organizations table
-- =====================================================

ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Team members can view all org memberships
CREATE POLICY "Team members can view all org memberships"
  ON user_organizations FOR SELECT
  USING (public.is_team_member());

-- Clients can view their own org memberships
CREATE POLICY "Users can view their own org memberships"
  ON user_organizations FOR SELECT
  USING (user_id = auth.uid());

-- Admin/manager can manage org memberships
CREATE POLICY "Admins can insert org memberships"
  ON user_organizations FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins can update org memberships"
  ON user_organizations FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete org memberships"
  ON user_organizations FOR DELETE
  USING (public.is_admin_or_manager());

-- =====================================================
-- STEP 9: Add helpful comments
-- =====================================================

COMMENT ON TABLE user_organizations IS 'Join table enabling users to belong to multiple organizations';
COMMENT ON COLUMN user_organizations.is_primary IS 'The primary org shown by default in the UI';
COMMENT ON COLUMN profiles.allowed_org_ids IS 'For user role: restricts which client orgs they can see (empty = all)';
COMMENT ON COLUMN profiles.role IS 'User role: admin (full access), manager (most access), user (restricted team), client (external), client_no_access (no login)';
