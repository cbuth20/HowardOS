-- =====================================================
-- NOTIFICATION PREFERENCES
-- Per-user email notification settings
-- =====================================================

CREATE TABLE notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_assigned BOOLEAN NOT NULL DEFAULT true,
  task_status_changed BOOLEAN NOT NULL DEFAULT true,
  task_comment_added BOOLEAN NOT NULL DEFAULT true,
  task_mentioned BOOLEAN NOT NULL DEFAULT true,
  file_uploaded BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Updated_at trigger
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "view_own_notification_preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

-- Users can upsert their own preferences
CREATE POLICY "manage_own_notification_preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

COMMENT ON TABLE notification_preferences IS 'Per-user email notification settings';
