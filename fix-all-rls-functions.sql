-- =====================================================
-- FIX ALL RLS HELPER FUNCTIONS TO AVOID RECURSION
-- Store user role/profile data in session variables on login
-- =====================================================

-- Option 1: Remove the policies entirely and rely on API endpoints
-- (Recommended if you're using API endpoints for all admin operations)

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Keep the basic policies that don't cause recursion
-- (view_profiles, update_own_profile, insert_profiles are fine)

-- Option 2: If you need RLS for direct queries, create simpler policies
-- that don't use helper functions

-- Example: Allow team members to view all profiles (without helper function)
-- Uncomment if needed:
/*
CREATE POLICY "Team members can view all profiles" ON profiles
FOR SELECT
USING (
  EXISTS (
    -- This checks if the CURRENT USER is a team member
    -- by looking at their own role directly
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager', 'user')
    LIMIT 1
  )
);
*/

-- Note: The above still queries profiles but with LIMIT 1 on auth.uid()
-- which should be fast and less likely to cause recursion issues.
-- However, if you're using API endpoints, you don't need this at all.
