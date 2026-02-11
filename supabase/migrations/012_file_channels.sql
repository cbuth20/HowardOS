-- =====================================================
-- FILE CHANNELS
-- Adds file channels (client-scoped file sharing spaces)
-- =====================================================

-- File Channels table
CREATE TABLE file_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_client_channel UNIQUE (org_id, client_org_id)
);

CREATE INDEX idx_file_channels_org_id ON file_channels(org_id);
CREATE INDEX idx_file_channels_client_org_id ON file_channels(client_org_id);

-- Add channel_id to files (nullable for backward compatibility)
ALTER TABLE files ADD COLUMN channel_id UUID REFERENCES file_channels(id) ON DELETE SET NULL;
CREATE INDEX idx_files_channel_id ON files(channel_id);

-- Channel folders (for creating named folders within channels)
CREATE TABLE channel_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES file_channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_path TEXT NOT NULL DEFAULT '/',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_channel_folder UNIQUE (channel_id, parent_path, name)
);

CREATE INDEX idx_channel_folders_channel_id ON channel_folders(channel_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE file_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_folders ENABLE ROW LEVEL SECURITY;

-- Admins can view channels they own
CREATE POLICY "Admins can view their org channels"
  ON file_channels FOR SELECT
  USING (org_id = public.get_user_org_id());

-- Clients can view channels where they are the client
CREATE POLICY "Clients can view their channels"
  ON file_channels FOR SELECT
  USING (client_org_id = public.get_user_org_id());

-- Admins can insert channels
CREATE POLICY "Admins can create channels"
  ON file_channels FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

-- Admins can update their own channels
CREATE POLICY "Admins can update channels"
  ON file_channels FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

-- Admins can delete their own channels
CREATE POLICY "Admins can delete channels"
  ON file_channels FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

-- Channel folders: visible to anyone who can see the channel
CREATE POLICY "Users can view channel folders"
  ON channel_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_channels
      WHERE file_channels.id = channel_folders.channel_id
      AND (file_channels.org_id = public.get_user_org_id()
           OR file_channels.client_org_id = public.get_user_org_id())
    )
  );

-- Admins can manage channel folders
CREATE POLICY "Admins can manage channel folders"
  ON channel_folders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM file_channels
      WHERE file_channels.id = channel_folders.channel_id
      AND file_channels.org_id = public.get_user_org_id()
      AND public.get_user_role() = 'admin'
    )
  );

-- Allow clients to view files in their channel
-- (Extends existing files RLS - clients can see channel files)
CREATE POLICY "Clients can view channel files"
  ON files FOR SELECT
  USING (
    channel_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM file_channels
      WHERE file_channels.id = files.channel_id
      AND file_channels.client_org_id = public.get_user_org_id()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_file_channels_updated_at
  BEFORE UPDATE ON file_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
