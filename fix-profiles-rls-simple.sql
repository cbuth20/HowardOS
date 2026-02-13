-- =====================================================
-- FIX PROFILES RLS RECURSION - SIMPLE SOLUTION
-- Remove recursive admin policies, use API endpoints instead
-- =====================================================

-- Drop the recursive policies that cause infinite loop
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Keep only the simple, non-recursive policies
-- Users can view their own profile (already exists as "view_profiles")
-- Users can update their own profile (already exists as "update_own_profile")
-- Users can insert their own profile (already exists as "insert_profiles")

-- For admin operations (updating other users, bulk updates, etc.),
-- use API endpoints with middleware instead of direct Supabase client

-- Note: Your API endpoints use withMiddleware() with service role,
-- which bypasses RLS, so they don't need these policies anyway.
