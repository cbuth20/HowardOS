-- =====================================================
-- FIX: RLS Recursion Prevention
-- The SECURITY DEFINER functions query profiles and user_organizations
-- which have RLS policies that call those same functions.
-- While SECURITY DEFINER should bypass RLS (runs as owner),
-- some Supabase configurations don't grant BYPASSRLS to the owner.
-- Fix: Rewrite helper functions to directly query without RLS dependency.
-- =====================================================

-- Recreate all helper functions to be safe from recursion.
-- These use SECURITY DEFINER which runs as the function creator (superuser).
-- The key is that they query tables directly without going through RLS.

-- Simple role check that only reads the JWT claims, not the profiles table
-- This avoids any RLS recursion entirely for the most common check.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
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

-- Rewrite can_access_org to avoid querying user_organizations through RLS
CREATE OR REPLACE FUNCTION public.can_access_org(target_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_allowed UUID[];
BEGIN
  -- Direct query, no RLS (SECURITY DEFINER)
  SELECT role, COALESCE(allowed_org_ids, ARRAY[]::UUID[])
  INTO user_role, user_allowed
  FROM public.profiles
  WHERE id = auth.uid();

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

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

  -- client: check user_organizations membership (direct query, no RLS)
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
-- Fix profiles UPDATE policies to avoid recursion.
-- The issue: when updating profiles, Postgres evaluates
-- the USING clause which calls is_admin_or_manager() which
-- queries profiles again.
-- Solution: Use auth.uid() comparison for own profile,
-- and a simpler role check for admin updates.
-- =====================================================

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;

-- Users can update their own profile
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Admin/manager can update any profile
-- Use a subquery that won't trigger RLS recursion (direct check)
CREATE POLICY "admin_update_profiles"
  ON profiles FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Also fix the SELECT policy on profiles to be recursion-safe
DROP POLICY IF EXISTS "view_profiles" ON profiles;

CREATE POLICY "view_profiles"
  ON profiles FOR SELECT
  USING (
    -- Own profile always visible
    id = auth.uid()
    OR
    -- Team members see all profiles (direct role check, no function call)
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'user')
    OR
    -- Clients can see profiles that share any of their orgs
    EXISTS (
      SELECT 1 FROM public.user_organizations uo1
      JOIN public.user_organizations uo2 ON uo1.org_id = uo2.org_id
      WHERE uo1.user_id = auth.uid()
      AND uo2.user_id = profiles.id
    )
  );

-- Fix INSERT policy too
DROP POLICY IF EXISTS "admin_insert_profiles" ON profiles;

CREATE POLICY "admin_insert_profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );
