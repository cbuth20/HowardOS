-- =====================================================
-- FIX: Profiles RLS recursion (final fix)
--
-- Problem: ANY profiles policy that checks the user's role
-- must query the profiles table, which triggers the same
-- policy evaluation = infinite recursion (Postgres error 42P17).
-- SECURITY DEFINER doesn't help — Postgres detects the
-- circular dependency at the policy level.
--
-- Solution: Profiles UPDATE/INSERT policies should NOT
-- check the user's role. Only allow self-updates via RLS.
-- All admin operations (updating other users' profiles)
-- go through the service role client (supabaseAdmin) which
-- bypasses RLS entirely.
-- =====================================================

-- Drop all existing profiles UPDATE and INSERT policies
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_insert_profiles" ON profiles;

-- Users can update their own profile (no role check needed)
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- INSERT: Only via service role (supabaseAdmin).
-- No INSERT policy for regular users — the auto-create trigger
-- uses SECURITY DEFINER and the invite flow uses supabaseAdmin.
-- If we need a policy, use a simple auth check:
CREATE POLICY "insert_profiles"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- SELECT policy stays as-is (uses SECURITY DEFINER functions
-- which DO work for SELECT because the recursion only happens
-- when an UPDATE/INSERT policy triggers a SELECT on the same table
-- during the same policy evaluation chain).
-- But let's simplify it too just to be safe:
DROP POLICY IF EXISTS "view_profiles" ON profiles;

CREATE POLICY "view_profiles"
  ON profiles FOR SELECT
  USING (
    -- Everyone can see their own profile (no function call)
    id = auth.uid()
    OR
    -- Team members see all (SECURITY DEFINER bypasses RLS for this read)
    public.is_team_member()
    OR
    -- Clients see profiles in shared orgs
    EXISTS (
      SELECT 1 FROM public.user_organizations uo1
      JOIN public.user_organizations uo2 ON uo1.org_id = uo2.org_id
      WHERE uo1.user_id = auth.uid()
      AND uo2.user_id = profiles.id
    )
  );

-- NOTE: Admin profile updates (changing role, org_id, is_active for OTHER users)
-- must go through the API layer which uses supabaseAdmin (service role).
-- The service role bypasses RLS completely. This is the correct architecture:
-- RLS handles data isolation, application layer handles authorization.
