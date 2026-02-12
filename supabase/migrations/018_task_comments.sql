-- =====================================================
-- TASK COMMENTS with @Mentions
-- =====================================================

CREATE TABLE task_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Team members can view comments on tasks they can access
CREATE POLICY "view_task_comments"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
      AND public.can_access_org(tasks.org_id)
    )
    AND (
      -- Team can see all comments including internal
      public.is_team_member()
      OR
      -- Clients can only see non-internal comments
      (NOT task_comments.is_internal)
    )
  );

-- Authenticated users can create comments on tasks they can access
CREATE POLICY "create_task_comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
      AND public.can_access_org(tasks.org_id)
    )
  );

-- Users can update their own comments
CREATE POLICY "update_own_task_comments"
  ON task_comments FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own comments, admins/managers can delete any
CREATE POLICY "delete_task_comments"
  ON task_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_manager()
  );

COMMENT ON TABLE task_comments IS 'Comments on tasks with @mention support';
COMMENT ON COLUMN task_comments.mentions IS 'Array of user IDs mentioned in this comment';
COMMENT ON COLUMN task_comments.is_internal IS 'Internal comments visible only to team members';
