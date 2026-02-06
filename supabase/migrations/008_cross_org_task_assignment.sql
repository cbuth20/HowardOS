-- Update RLS policies for tasks to support cross-org assignment
-- This allows admins to assign tasks to clients in any organization

-- Drop existing task policies
DROP POLICY IF EXISTS "Users can view tasks in their org" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their org" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their org" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks in their org" ON tasks;

-- New policy: Admins can view all tasks, clients can only see tasks assigned to them
CREATE POLICY "view_tasks"
  ON tasks FOR SELECT
  USING (
    -- Admins can see all tasks
    public.get_user_role() = 'admin'
    OR
    -- Clients can see tasks assigned to them
    (public.get_user_role() = 'client' AND assigned_to = auth.uid())
  );

-- New policy: Admins can create tasks in any org, clients can create tasks in their own org
CREATE POLICY "create_tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    -- Admins can create tasks in any org
    public.get_user_role() = 'admin'
    OR
    -- Clients can create tasks in their own org
    (public.get_user_role() = 'client' AND org_id = public.get_user_org_id())
  );

-- New policy: Users can update tasks they're involved with
CREATE POLICY "update_tasks"
  ON tasks FOR UPDATE
  USING (
    -- Admins can update any task
    public.get_user_role() = 'admin'
    OR
    -- Clients can update tasks assigned to them or created by them
    (public.get_user_role() = 'client' AND (assigned_to = auth.uid() OR created_by = auth.uid()))
  );

-- New policy: Admins can delete any task, clients can only delete their own created tasks
CREATE POLICY "delete_tasks"
  ON tasks FOR DELETE
  USING (
    -- Admins can delete any task
    public.get_user_role() = 'admin'
    OR
    -- Clients can delete tasks they created
    (public.get_user_role() = 'client' AND created_by = auth.uid())
  );

-- Also update profiles RLS to allow admins to view profiles across orgs
-- This is needed for the admin UI to show all users when assigning tasks
DROP POLICY IF EXISTS "Users can view profiles in their org" ON profiles;

CREATE POLICY "view_profiles"
  ON profiles FOR SELECT
  USING (
    -- Admins can see all profiles
    public.get_user_role() = 'admin'
    OR
    -- Clients can see profiles in their org
    org_id = public.get_user_org_id()
  );

-- Update organizations RLS to allow admins to view all organizations
-- This is needed for the admin UI to show all orgs when assigning tasks
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

CREATE POLICY "view_organizations"
  ON organizations FOR SELECT
  USING (
    -- Admins can see all organizations
    public.get_user_role() = 'admin'
    OR
    -- Clients can see their own organization
    id = public.get_user_org_id()
  );

COMMENT ON POLICY "view_tasks" ON tasks IS 'Admins see all tasks, clients see only tasks assigned to them';
COMMENT ON POLICY "create_tasks" ON tasks IS 'Admins can create tasks in any org, clients only in their own org';
COMMENT ON POLICY "update_tasks" ON tasks IS 'Admins can update any task, clients can update tasks they are involved with';
COMMENT ON POLICY "delete_tasks" ON tasks IS 'Admins can delete any task, clients can delete tasks they created';
