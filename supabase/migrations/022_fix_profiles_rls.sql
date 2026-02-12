-- =====================================================
-- FIX: Profiles RLS policies (revert migration 021 mistake)
--
-- Migration 021 replaced SECURITY DEFINER function calls with
-- inline subqueries in profiles policies. Inline subqueries
-- DO NOT bypass RLS, causing self-referential recursion on
-- the profiles table. SECURITY DEFINER functions DO bypass
-- RLS because they run as the function owner (superuser).
--
-- Fix: Go back to using the SECURITY DEFINER helper functions,
-- but with a special handling for profiles SELECT to avoid
-- the recursion: use get_user_role() which is SECURITY DEFINER.
-- =====================================================

-- First, make sure all helper functions are correct and owned by the right role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'manager', 'user') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'manager') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_access_org(target_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_allowed UUID[];
BEGIN
  SELECT role, COALESCE(allowed_org_ids, ARRAY[]::UUID[])
  INTO user_role, user_allowed
  FROM public.profiles
  WHERE id = auth.uid();

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  IF user_role IN ('admin', 'manager') THEN
    RETURN true;
  END IF;

  IF user_role = 'user' THEN
    IF array_length(user_allowed, 1) IS NULL OR array_length(user_allowed, 1) = 0 THEN
      RETURN true;
    END IF;
    RETURN target_org_id = ANY(user_allowed);
  END IF;

  IF user_role = 'client' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE user_id = auth.uid()
      AND org_id = target_org_id
    );
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- Recreate profiles policies using SECURITY DEFINER functions
-- These functions bypass RLS so no recursion occurs.
-- =====================================================

DROP POLICY IF EXISTS "view_profiles" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_insert_profiles" ON profiles;

-- SELECT: team sees all, clients see shared orgs, everyone sees self
CREATE POLICY "view_profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR
    public.is_team_member()
    OR
    EXISTS (
      SELECT 1 FROM public.user_organizations uo1
      JOIN public.user_organizations uo2 ON uo1.org_id = uo2.org_id
      WHERE uo1.user_id = auth.uid()
      AND uo2.user_id = profiles.id
    )
  );

-- UPDATE: own profile always, admin/manager can update any
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "admin_update_profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin_or_manager());

-- INSERT: admin/manager only
CREATE POLICY "admin_insert_profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_admin_or_manager());
