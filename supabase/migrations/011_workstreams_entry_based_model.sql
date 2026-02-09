-- Migration: Transform Workstreams to Entry-Based Model
-- Description: Converts template-assignment model to one-workstream-per-org with multiple entries
-- Date: 2026-02-09

-- ============================================================================
-- STEP 1: Create new tables for entry-based model
-- ============================================================================

-- ONE workstream per organization
CREATE TABLE new_client_workstreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Workstream',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_new_client_workstreams_org ON new_client_workstreams(org_id);

-- Multiple entries per workstream (the granular activities)
CREATE TABLE workstream_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workstream_id UUID NOT NULL REFERENCES new_client_workstreams(id) ON DELETE CASCADE,
  vertical_id UUID NOT NULL REFERENCES workstream_verticals(id),

  -- Entry details
  name TEXT NOT NULL,
  description TEXT,
  associated_software TEXT,
  timing TEXT CHECK (timing IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad-hoc')),

  -- Ownership and status
  point_person_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'yellow' CHECK (status IN ('red', 'yellow', 'green')),
  notes TEXT,

  -- SOP support
  custom_sop JSONB,

  -- Ordering and soft delete
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Optional template reference (for tracking which template created this entry)
  template_id UUID REFERENCES workstream_templates(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workstream_entries_workstream ON workstream_entries(workstream_id);
CREATE INDEX idx_workstream_entries_vertical ON workstream_entries(vertical_id);
CREATE INDEX idx_workstream_entries_status ON workstream_entries(status);
CREATE INDEX idx_workstream_entries_point_person ON workstream_entries(point_person_id);
CREATE INDEX idx_workstream_entries_active ON workstream_entries(is_active);
CREATE INDEX idx_workstream_entries_template ON workstream_entries(template_id);

-- Entry-level status history (audit trail)
CREATE TABLE workstream_entry_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES workstream_entries(id) ON DELETE CASCADE,
  old_status TEXT CHECK (old_status IN ('red', 'yellow', 'green')),
  new_status TEXT NOT NULL CHECK (new_status IN ('red', 'yellow', 'green')),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workstream_entry_status_history_entry ON workstream_entry_status_history(entry_id);
CREATE INDEX idx_workstream_entry_status_history_changed_by ON workstream_entry_status_history(changed_by);

-- ============================================================================
-- STEP 2: Migrate existing data from old model to new model
-- ============================================================================

-- For each organization with workstream assignments:
-- 1. Create ONE client_workstream per org
-- 2. Convert each old template assignment into a workstream_entry
-- 3. Preserve all metadata (status, POC, notes, timing)

DO $$
DECLARE
  org_record RECORD;
  new_workstream_id UUID;
  assignment_record RECORD;
  entry_order INTEGER;
BEGIN
  -- Loop through each organization that has workstream assignments
  FOR org_record IN
    SELECT DISTINCT org_id
    FROM client_workstreams
    WHERE is_active = TRUE
  LOOP
    -- Create ONE workstream for this organization
    INSERT INTO new_client_workstreams (org_id, name, notes, created_by, created_at, updated_at)
    VALUES (
      org_record.org_id,
      'Workstream',
      'Migrated from template-based model',
      (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), -- Use first admin as creator
      NOW(),
      NOW()
    )
    RETURNING id INTO new_workstream_id;

    RAISE NOTICE 'Created workstream % for org %', new_workstream_id, org_record.org_id;

    -- Convert each old assignment into an entry
    entry_order := 0;
    FOR assignment_record IN
      SELECT
        cw.*,
        wt.name as template_name,
        wt.description as template_description,
        wt.associated_software,
        wt.timing,
        wt.default_sop,
        wt.vertical_id,
        wt.display_order as template_display_order
      FROM client_workstreams cw
      JOIN workstream_templates wt ON wt.id = cw.template_id
      WHERE cw.org_id = org_record.org_id
        AND cw.is_active = TRUE
      ORDER BY wt.vertical_id, wt.display_order
    LOOP
      -- Create entry from old assignment
      INSERT INTO workstream_entries (
        workstream_id,
        vertical_id,
        name,
        description,
        associated_software,
        timing,
        point_person_id,
        status,
        notes,
        custom_sop,
        display_order,
        is_active,
        template_id,
        created_at,
        updated_at
      )
      VALUES (
        new_workstream_id,
        assignment_record.vertical_id,
        assignment_record.template_name,
        assignment_record.template_description,
        assignment_record.associated_software,
        assignment_record.timing,
        assignment_record.point_person_id,
        assignment_record.status,
        assignment_record.notes,
        COALESCE(assignment_record.custom_sop, assignment_record.default_sop),
        entry_order,
        TRUE,
        assignment_record.template_id,
        assignment_record.created_at,
        assignment_record.updated_at
      );

      entry_order := entry_order + 1;
      RAISE NOTICE 'Created entry for template % in workstream %', assignment_record.template_name, new_workstream_id;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Data migration completed successfully';
END $$;

-- ============================================================================
-- STEP 3: Create materialized view for status rollups (performance optimization)
-- ============================================================================

CREATE MATERIALIZED VIEW workstream_vertical_status AS
SELECT
  workstream_id,
  vertical_id,
  CASE
    WHEN COUNT(*) FILTER (WHERE status = 'red') > 0 THEN 'red'
    WHEN COUNT(*) FILTER (WHERE status = 'yellow') > 0 THEN 'yellow'
    ELSE 'green'
  END as rollup_status,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE status = 'red') as red_count,
  COUNT(*) FILTER (WHERE status = 'yellow') as yellow_count,
  COUNT(*) FILTER (WHERE status = 'green') as green_count
FROM workstream_entries
WHERE is_active = TRUE
GROUP BY workstream_id, vertical_id;

CREATE UNIQUE INDEX idx_workstream_vertical_status_pk ON workstream_vertical_status(workstream_id, vertical_id);
CREATE INDEX idx_workstream_vertical_status_workstream ON workstream_vertical_status(workstream_id);

-- ============================================================================
-- STEP 4: Set up triggers for updated_at and status history
-- ============================================================================

-- Trigger for new_client_workstreams updated_at
CREATE TRIGGER trigger_new_client_workstreams_updated_at
  BEFORE UPDATE ON new_client_workstreams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for workstream_entries updated_at
CREATE TRIGGER trigger_workstream_entries_updated_at
  BEFORE UPDATE ON workstream_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for entry status history logging
CREATE OR REPLACE FUNCTION log_entry_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO workstream_entry_status_history (
      entry_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), -- Default to first admin
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );

    -- Refresh materialized view after status change
    REFRESH MATERIALIZED VIEW CONCURRENTLY workstream_vertical_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_entry_status_change
  AFTER UPDATE ON workstream_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_entry_status_change();

-- Trigger to refresh materialized view on entry insert/delete
CREATE OR REPLACE FUNCTION refresh_workstream_rollup()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY workstream_vertical_status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_refresh_rollup_on_insert
  AFTER INSERT ON workstream_entries
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_workstream_rollup();

CREATE TRIGGER trigger_refresh_rollup_on_delete
  AFTER UPDATE OF is_active ON workstream_entries
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_workstream_rollup();

-- ============================================================================
-- STEP 5: Set up RLS policies
-- ============================================================================

-- RLS for new_client_workstreams
ALTER TABLE new_client_workstreams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all workstreams"
  ON new_client_workstreams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view their own workstream"
  ON new_client_workstreams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = new_client_workstreams.org_id
    )
  );

CREATE POLICY "Admins can create workstreams"
  ON new_client_workstreams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update workstreams"
  ON new_client_workstreams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete workstreams"
  ON new_client_workstreams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS for workstream_entries
ALTER TABLE workstream_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all entries"
  ON workstream_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view entries in their workstream"
  ON workstream_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM new_client_workstreams cw
      JOIN profiles p ON p.id = auth.uid()
      WHERE cw.id = workstream_entries.workstream_id
      AND p.org_id = cw.org_id
    )
  );

CREATE POLICY "Admins can create entries"
  ON workstream_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update entries"
  ON workstream_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete entries"
  ON workstream_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS for workstream_entry_status_history
ALTER TABLE workstream_entry_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all entry status history"
  ON workstream_entry_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view their entries' status history"
  ON workstream_entry_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workstream_entries we
      JOIN new_client_workstreams cw ON cw.id = we.workstream_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE we.id = workstream_entry_status_history.entry_id
      AND p.org_id = cw.org_id
    )
  );

-- ============================================================================
-- STEP 6: Drop old tables (after migration is confirmed successful)
-- ============================================================================

-- Drop old policies first
DROP POLICY IF EXISTS "Admins can view all status history" ON workstream_status_history;
DROP POLICY IF EXISTS "Clients can view their own workstream history" ON workstream_status_history;
DROP POLICY IF EXISTS "Admins can delete client workstreams" ON client_workstreams;
DROP POLICY IF EXISTS "Admins can update client workstreams" ON client_workstreams;
DROP POLICY IF EXISTS "Admins can create client workstreams" ON client_workstreams;
DROP POLICY IF EXISTS "Clients can view their own workstreams" ON client_workstreams;
DROP POLICY IF EXISTS "Admins can view all client workstreams" ON client_workstreams;

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_log_workstream_status_change ON client_workstreams;
DROP TRIGGER IF EXISTS trigger_client_workstreams_updated_at ON client_workstreams;

-- Drop old tables
DROP TABLE IF EXISTS workstream_status_history CASCADE;
DROP TABLE IF EXISTS client_workstreams CASCADE;

-- Rename new table to final name
ALTER TABLE new_client_workstreams RENAME TO client_workstreams;
ALTER INDEX idx_new_client_workstreams_org RENAME TO idx_client_workstreams_org;

-- ============================================================================
-- STEP 7: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE client_workstreams IS 'One workstream per organization containing multiple entries';
COMMENT ON TABLE workstream_entries IS 'Granular activities within a workstream, organized by verticals';
COMMENT ON TABLE workstream_entry_status_history IS 'Audit trail for entry-level status changes';
COMMENT ON MATERIALIZED VIEW workstream_vertical_status IS 'Rollup of entry statuses by vertical for performance';

-- ============================================================================
-- Migration complete!
-- ============================================================================
