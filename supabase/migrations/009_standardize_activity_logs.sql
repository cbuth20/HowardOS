-- =====================================================
-- STANDARDIZE ACTIVITY LOG TABLE
-- =====================================================

-- Rename table to activity_logs (plural for consistency)
ALTER TABLE activity_log RENAME TO activity_logs;

-- Rename columns for consistency
ALTER TABLE activity_logs RENAME COLUMN entity_type TO resource_type;
ALTER TABLE activity_logs RENAME COLUMN entity_id TO resource_id;
ALTER TABLE activity_logs RENAME COLUMN metadata TO details;

-- Update index names
DROP INDEX IF EXISTS idx_activity_log_org_id;
DROP INDEX IF EXISTS idx_activity_log_user_id;
DROP INDEX IF EXISTS idx_activity_log_entity;
DROP INDEX IF EXISTS idx_activity_log_created_at;

CREATE INDEX idx_activity_logs_org_id ON activity_logs(org_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Note: RLS policies are automatically updated when table is renamed
