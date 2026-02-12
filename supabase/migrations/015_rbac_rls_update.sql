-- =====================================================
-- RBAC RLS Policy Update
-- Updates all existing RLS policies for the 5-role hierarchy:
--   admin     → full access
--   manager   → most access (same as admin for data, can't manage roles)
--   user      → team member restricted by allowed_org_ids
--   client    → sees only their org(s) via user_organizations
--   client_no_access → cannot log in, sees nothing
-- =====================================================

-- =====================================================
-- ORGANIZATIONS
-- =====================================================

DROP POLICY IF EXISTS "view_organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;

-- Team sees all orgs (user role filtered by allowed_org_ids)
-- Clients see orgs they belong to
CREATE POLICY "view_organizations"
  ON organizations FOR SELECT
  USING (public.can_access_org(id));

-- Admin/manager can update any org
CREATE POLICY "admin_update_organizations"
  ON organizations FOR UPDATE
  USING (public.is_admin_or_manager());

-- Admin/manager can create orgs
CREATE POLICY "admin_create_organizations"
  ON organizations FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

-- =====================================================
-- PROFILES
-- =====================================================

DROP POLICY IF EXISTS "view_profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in their org" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their org" ON profiles;

-- Team members see all profiles; clients see profiles in their orgs
CREATE POLICY "view_profiles"
  ON profiles FOR SELECT
  USING (
    public.is_team_member()
    OR
    -- Clients can see profiles that share any of their orgs
    EXISTS (
      SELECT 1 FROM user_organizations uo1
      JOIN user_organizations uo2 ON uo1.org_id = uo2.org_id
      WHERE uo1.user_id = auth.uid()
      AND uo2.user_id = profiles.id
    )
    OR
    -- Users can always see their own profile
    id = auth.uid()
  );

-- Users can update their own profile (non-role fields)
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Admin/manager can insert profiles
CREATE POLICY "admin_insert_profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

-- Admin/manager can update any profile
CREATE POLICY "admin_update_profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin_or_manager());

-- =====================================================
-- FILES
-- =====================================================

DROP POLICY IF EXISTS "Users can view files in their org" ON files;
DROP POLICY IF EXISTS "Users can upload files to their org" ON files;
DROP POLICY IF EXISTS "Admins can update files in their org" ON files;
DROP POLICY IF EXISTS "Uploaders can update their own files" ON files;
DROP POLICY IF EXISTS "Admins can delete files in their org" ON files;
DROP POLICY IF EXISTS "Clients can view channel files" ON files;

-- Team: see all files (user role filtered by allowed_org_ids)
-- Client: see files in their org(s) OR channel files
CREATE POLICY "view_files"
  ON files FOR SELECT
  USING (
    -- Team members (admin/manager see all, user restricted by allowed_org_ids)
    (public.is_team_member() AND public.can_access_org(org_id))
    OR
    -- Client: files in their org
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.org_id = files.org_id
    )
    OR
    -- Client: channel files where they are the client
    (channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM file_channels fc
      JOIN user_organizations uo ON uo.org_id = fc.client_org_id
      WHERE fc.id = files.channel_id
      AND uo.user_id = auth.uid()
    ))
  );

-- Team can upload to any org they can access; clients upload to their org
CREATE POLICY "insert_files"
  ON files FOR INSERT
  WITH CHECK (
    (public.is_team_member() AND public.can_access_org(org_id))
    OR
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.org_id = files.org_id
    )
  );

-- Admin/manager can update any file; uploaders can update own files
CREATE POLICY "update_files"
  ON files FOR UPDATE
  USING (
    public.is_admin_or_manager()
    OR
    uploaded_by = auth.uid()
  );

-- Admin/manager can delete files
CREATE POLICY "delete_files"
  ON files FOR DELETE
  USING (public.is_admin_or_manager());

-- =====================================================
-- FILE PERMISSIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view file permissions in their org" ON file_permissions;
DROP POLICY IF EXISTS "Admins can manage file permissions" ON file_permissions;

CREATE POLICY "view_file_permissions"
  ON file_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_permissions.file_id
      AND public.can_access_org(files.org_id)
    )
  );

CREATE POLICY "admin_manage_file_permissions"
  ON file_permissions FOR ALL
  USING (public.is_admin_or_manager());

-- =====================================================
-- TASKS
-- =====================================================

DROP POLICY IF EXISTS "view_tasks" ON tasks;
DROP POLICY IF EXISTS "create_tasks" ON tasks;
DROP POLICY IF EXISTS "update_tasks" ON tasks;
DROP POLICY IF EXISTS "delete_tasks" ON tasks;

-- Team: see all tasks (user restricted by allowed_org_ids)
-- Client: see tasks assigned to them
CREATE POLICY "view_tasks"
  ON tasks FOR SELECT
  USING (
    (public.is_team_member() AND public.can_access_org(org_id))
    OR
    (public.get_user_role() = 'client' AND assigned_to = auth.uid())
  );

-- Team can create tasks; clients can create in their own org
CREATE POLICY "create_tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    (public.is_team_member() AND public.can_access_org(org_id))
    OR
    (public.get_user_role() = 'client' AND EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.org_id = tasks.org_id
    ))
  );

-- Team can update tasks they can access; clients update tasks they're involved with
CREATE POLICY "update_tasks"
  ON tasks FOR UPDATE
  USING (
    (public.is_team_member() AND public.can_access_org(org_id))
    OR
    (public.get_user_role() = 'client' AND (assigned_to = auth.uid() OR created_by = auth.uid()))
  );

-- Admin/manager can delete any task; clients can delete tasks they created
CREATE POLICY "delete_tasks"
  ON tasks FOR DELETE
  USING (
    public.is_admin_or_manager()
    OR
    (public.get_user_role() = 'client' AND created_by = auth.uid())
  );

-- =====================================================
-- TASK ATTACHMENTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view task attachments in their org" ON task_attachments;
DROP POLICY IF EXISTS "Users can attach files to tasks" ON task_attachments;
DROP POLICY IF EXISTS "Users can remove task attachments" ON task_attachments;

CREATE POLICY "view_task_attachments"
  ON task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND public.can_access_org(tasks.org_id)
    )
  );

CREATE POLICY "insert_task_attachments"
  ON task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND public.can_access_org(tasks.org_id)
    )
  );

CREATE POLICY "delete_task_attachments"
  ON task_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND public.can_access_org(tasks.org_id)
    )
  );

-- =====================================================
-- ACTIVITY LOG
-- =====================================================

DROP POLICY IF EXISTS "Users can view activity in their org" ON activity_log;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_log;

CREATE POLICY "view_activity_log"
  ON activity_log FOR SELECT
  USING (public.can_access_org(org_id));

CREATE POLICY "insert_activity_log"
  ON activity_log FOR INSERT
  WITH CHECK (public.can_access_org(org_id));

-- =====================================================
-- NOTIFICATIONS (unchanged - user-scoped, not role-scoped)
-- =====================================================
-- Policies already use user_id = auth.uid(), which is correct for all roles

-- =====================================================
-- FILE CHANNELS
-- =====================================================

DROP POLICY IF EXISTS "Admins can view their org channels" ON file_channels;
DROP POLICY IF EXISTS "Clients can view their channels" ON file_channels;
DROP POLICY IF EXISTS "Admins can create channels" ON file_channels;
DROP POLICY IF EXISTS "Admins can update channels" ON file_channels;
DROP POLICY IF EXISTS "Admins can delete channels" ON file_channels;

-- Team can view all channels (user restricted by allowed_org_ids on client_org_id)
CREATE POLICY "view_file_channels"
  ON file_channels FOR SELECT
  USING (
    (public.is_team_member() AND public.can_access_org(client_org_id))
    OR
    -- Clients can view channels for their org
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.org_id = file_channels.client_org_id
    )
  );

-- Admin/manager can create channels
CREATE POLICY "admin_create_file_channels"
  ON file_channels FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

-- Admin/manager can update channels
CREATE POLICY "admin_update_file_channels"
  ON file_channels FOR UPDATE
  USING (public.is_admin_or_manager());

-- Admin/manager can delete channels
CREATE POLICY "admin_delete_file_channels"
  ON file_channels FOR DELETE
  USING (public.is_admin_or_manager());

-- =====================================================
-- CHANNEL FOLDERS
-- =====================================================

DROP POLICY IF EXISTS "Users can view channel folders" ON channel_folders;
DROP POLICY IF EXISTS "Admins can manage channel folders" ON channel_folders;

-- Anyone who can see the channel can see its folders
CREATE POLICY "view_channel_folders"
  ON channel_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_channels fc
      WHERE fc.id = channel_folders.channel_id
      AND (
        (public.is_team_member() AND public.can_access_org(fc.client_org_id))
        OR
        EXISTS (
          SELECT 1 FROM user_organizations uo
          WHERE uo.user_id = auth.uid()
          AND uo.org_id = fc.client_org_id
        )
      )
    )
  );

-- Admin/manager can manage folders
CREATE POLICY "admin_manage_channel_folders"
  ON channel_folders FOR ALL
  USING (public.is_admin_or_manager());

-- =====================================================
-- WORKSTREAM TABLES
-- =====================================================

-- client_workstreams
DROP POLICY IF EXISTS "Admins can view all workstreams" ON client_workstreams;
DROP POLICY IF EXISTS "Clients can view their own workstream" ON client_workstreams;
DROP POLICY IF EXISTS "Admins can create workstreams" ON client_workstreams;
DROP POLICY IF EXISTS "Admins can update workstreams" ON client_workstreams;
DROP POLICY IF EXISTS "Admins can delete workstreams" ON client_workstreams;

CREATE POLICY "view_client_workstreams"
  ON client_workstreams FOR SELECT
  USING (
    (public.is_team_member() AND public.can_access_org(org_id))
    OR
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.org_id = client_workstreams.org_id
    )
  );

CREATE POLICY "admin_create_client_workstreams"
  ON client_workstreams FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "admin_update_client_workstreams"
  ON client_workstreams FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "admin_delete_client_workstreams"
  ON client_workstreams FOR DELETE
  USING (public.is_admin_or_manager());

-- workstream_entries
DROP POLICY IF EXISTS "Admins can view all entries" ON workstream_entries;
DROP POLICY IF EXISTS "Clients can view entries in their workstream" ON workstream_entries;
DROP POLICY IF EXISTS "Admins can create entries" ON workstream_entries;
DROP POLICY IF EXISTS "Admins can update entries" ON workstream_entries;
DROP POLICY IF EXISTS "Admins can delete entries" ON workstream_entries;

CREATE POLICY "view_workstream_entries"
  ON workstream_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_workstreams cw
      WHERE cw.id = workstream_entries.workstream_id
      AND (
        (public.is_team_member() AND public.can_access_org(cw.org_id))
        OR
        EXISTS (
          SELECT 1 FROM user_organizations uo
          WHERE uo.user_id = auth.uid()
          AND uo.org_id = cw.org_id
        )
      )
    )
  );

CREATE POLICY "admin_create_workstream_entries"
  ON workstream_entries FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "admin_update_workstream_entries"
  ON workstream_entries FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "admin_delete_workstream_entries"
  ON workstream_entries FOR DELETE
  USING (public.is_admin_or_manager());

-- workstream_entry_status_history
DROP POLICY IF EXISTS "Admins can view all entry status history" ON workstream_entry_status_history;
DROP POLICY IF EXISTS "Clients can view their entries' status history" ON workstream_entry_status_history;

CREATE POLICY "view_workstream_entry_status_history"
  ON workstream_entry_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workstream_entries we
      JOIN client_workstreams cw ON cw.id = we.workstream_id
      WHERE we.id = workstream_entry_status_history.entry_id
      AND (
        (public.is_team_member() AND public.can_access_org(cw.org_id))
        OR
        EXISTS (
          SELECT 1 FROM user_organizations uo
          WHERE uo.user_id = auth.uid()
          AND uo.org_id = cw.org_id
        )
      )
    )
  );

-- workstream_verticals (reference data - anyone can view, unchanged)
-- workstream_templates (admin-only CRUD - need to update for manager too)

-- Check if template policies exist before dropping
DO $$
BEGIN
  -- Drop template policies if they exist
  DROP POLICY IF EXISTS "Admins can view all templates" ON workstream_templates;
  DROP POLICY IF EXISTS "Anyone can view templates" ON workstream_templates;
  DROP POLICY IF EXISTS "Admins can manage templates" ON workstream_templates;
  DROP POLICY IF EXISTS "Admins can create templates" ON workstream_templates;
  DROP POLICY IF EXISTS "Admins can update templates" ON workstream_templates;
  DROP POLICY IF EXISTS "Admins can delete templates" ON workstream_templates;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'workstream_templates table does not exist, skipping policy drops';
END $$;

-- Recreate template policies for admin/manager
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workstream_templates') THEN
    EXECUTE 'CREATE POLICY "view_workstream_templates" ON workstream_templates FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "admin_manage_workstream_templates" ON workstream_templates FOR ALL USING (public.is_admin_or_manager())';
  END IF;
END $$;

-- =====================================================
-- Done! All RLS policies updated for 5-role hierarchy
-- =====================================================
