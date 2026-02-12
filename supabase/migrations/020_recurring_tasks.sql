-- =====================================================
-- RECURRING TASKS
-- Adds recurrence support to the tasks table.
-- recurrence_rule stores frequency config as JSONB:
--   { frequency: "weekly"|"monthly"|"quarterly", interval: 1, day_of_week?: 0-6, day_of_month?: 1-31 }
-- parent_task_id links generated instances back to the recurring template.
-- next_occurrence_at tracks when the next instance should be created.
-- =====================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule JSONB DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_occurrence_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON tasks(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_next_occurrence ON tasks(next_occurrence_at) WHERE is_recurring = true AND next_occurrence_at IS NOT NULL;

COMMENT ON COLUMN tasks.is_recurring IS 'Whether this task generates recurring instances';
COMMENT ON COLUMN tasks.recurrence_rule IS 'JSONB: { frequency, interval, day_of_week?, day_of_month? }';
COMMENT ON COLUMN tasks.parent_task_id IS 'Links a generated instance back to its recurring parent task';
COMMENT ON COLUMN tasks.next_occurrence_at IS 'When the next recurring instance should be created';
