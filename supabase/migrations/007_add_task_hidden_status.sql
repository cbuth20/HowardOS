-- Add 'hidden' status to tasks table
-- This migration extends the task status enum to include 'hidden' for archived/dismissed tasks

-- Drop the existing constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new constraint with 'hidden' status
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'hidden', 'cancelled'));

-- Update column comment
COMMENT ON COLUMN tasks.status IS 'Task status: pending, in_progress, completed, hidden, cancelled';

-- Create composite index for efficient filtering by org and status
CREATE INDEX IF NOT EXISTS idx_tasks_status_org ON tasks(org_id, status);

-- Create index for assignee filtering
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;

-- Create index for due date queries (finding overdue tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
