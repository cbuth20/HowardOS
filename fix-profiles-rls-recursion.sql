-- =====================================================
-- FIX PROFILES RLS INFINITE RECURSION
-- Replace subquery-based policies with function-based checks
-- =====================================================

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Recreate them using get_user_role() function (no recursion)
CREATE POLICY "Admins can update any profile" ON profiles
FOR UPDATE
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles" ON profiles
FOR INSERT
WITH CHECK (get_user_role() = 'admin');

-- Verify the function exists and works correctly
-- get_user_role() should use a security definer function or direct auth.jwt() check
-- to avoid recursion
