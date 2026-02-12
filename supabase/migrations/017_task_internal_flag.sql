-- =====================================================
-- TASK ENHANCEMENTS: Internal Flag
-- Replaces confusing "hidden" status with an is_internal boolean.
-- Internal tasks are visible to team members but hidden from clients.
-- =====================================================

-- Add is_internal column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing hidden tasks to internal
UPDATE tasks SET is_internal = true, status = 'pending' WHERE status = 'hidden';

-- Remove 'hidden' from the status enum
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Index for filtering internal tasks
CREATE INDEX IF NOT EXISTS idx_tasks_is_internal ON tasks(is_internal) WHERE is_internal = true;

COMMENT ON COLUMN tasks.is_internal IS 'Internal tasks are visible to team members only, hidden from client views';
