-- =====================================================
-- FIX PROFILES RLS INFINITE RECURSION - COMPLETE FIX
-- =====================================================

-- Solution: Create a function that bypasses RLS by using set_config
-- to temporarily disable RLS, then re-enable it

-- Drop and recreate get_user_role() to bypass RLS
DROP FUNCTION IF EXISTS get_user_role();

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Temporarily disable RLS for this query
  -- Note: This only works for the function owner (postgres/service_role)
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- Now recreate the admin policies using the fixed function
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

CREATE POLICY "Admins can update any profile" ON profiles
FOR UPDATE
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles" ON profiles
FOR INSERT
WITH CHECK (get_user_role() = 'admin');

-- Alternative approach: If recursion still happens, use API endpoints for admin operations
-- and remove these admin RLS policies entirely (rely on middleware instead)
