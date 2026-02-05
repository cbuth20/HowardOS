-- HowardOS Initial Schema Migration
-- Multi-tenant client portal with RLS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- =====================================================
-- FILES TABLE
-- =====================================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  folder_path TEXT NOT NULL DEFAULT '/',
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  parent_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_org_id ON files(org_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_folder_path ON files(folder_path);
CREATE INDEX idx_files_parent_file_id ON files(parent_file_id);

-- =====================================================
-- FILE PERMISSIONS TABLE
-- =====================================================
CREATE TABLE file_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'client')),
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'delete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT file_permissions_check CHECK (
    (user_id IS NOT NULL AND role IS NULL) OR
    (user_id IS NULL AND role IS NOT NULL)
  )
);

CREATE INDEX idx_file_permissions_file_id ON file_permissions(file_id);
CREATE INDEX idx_file_permissions_user_id ON file_permissions(user_id);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_org_id ON tasks(org_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- =====================================================
-- TASK ATTACHMENTS TABLE
-- =====================================================
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  attached_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, file_id)
);

CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_file_id ON task_attachments(file_id);

-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_org_id ON activity_log(org_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  entity_type TEXT,
  entity_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Get user's org_id from JWT or profile
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get user's role from JWT or profile
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own org
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = public.get_user_org_id());

CREATE POLICY "Admins can update their own organization"
  ON organizations FOR UPDATE
  USING (id = public.get_user_org_id() AND public.get_user_role() = 'admin');

-- Profiles: Users can see profiles in their org
CREATE POLICY "Users can view profiles in their org"
  ON profiles FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can insert profiles in their org"
  ON profiles FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Admins can update profiles in their org"
  ON profiles FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

-- Files: Org-level access with permission checks
CREATE POLICY "Users can view files in their org"
  ON files FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can upload files to their org"
  ON files FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Admins can update files in their org"
  ON files FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Uploaders can update their own files"
  ON files FOR UPDATE
  USING (org_id = public.get_user_org_id() AND uploaded_by = auth.uid());

CREATE POLICY "Admins can delete files in their org"
  ON files FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

-- File Permissions
CREATE POLICY "Users can view file permissions in their org"
  ON file_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_permissions.file_id
      AND files.org_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Admins can manage file permissions"
  ON file_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_permissions.file_id
      AND files.org_id = public.get_user_org_id()
    ) AND public.get_user_role() = 'admin'
  );

-- Tasks: Org-level access
CREATE POLICY "Users can view tasks in their org"
  ON tasks FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can create tasks in their org"
  ON tasks FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Users can update tasks in their org"
  ON tasks FOR UPDATE
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Admins can delete tasks in their org"
  ON tasks FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

-- Task Attachments
CREATE POLICY "Users can view task attachments in their org"
  ON task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND tasks.org_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Users can attach files to tasks"
  ON task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND tasks.org_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Users can remove task attachments"
  ON task_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND tasks.org_id = public.get_user_org_id()
    )
  );

-- Activity Log
CREATE POLICY "Users can view activity in their org"
  ON activity_log FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "System can insert activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

-- Notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create files bucket (run via Supabase dashboard or CLI)
-- This is a SQL comment as storage buckets are typically managed via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false);

-- Storage policies (to be applied after bucket creation)
-- CREATE POLICY "Users can view files in their org"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'files' AND
--     (storage.foldername(name))[1] = public.get_user_org_id()::text
--   );

-- CREATE POLICY "Users can upload files to their org"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'files' AND
--     (storage.foldername(name))[1] = public.get_user_org_id()::text
--   );

-- CREATE POLICY "Admins can delete files in their org"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'files' AND
--     (storage.foldername(name))[1] = public.get_user_org_id()::text AND
--     public.get_user_role() = 'admin'
--   );
