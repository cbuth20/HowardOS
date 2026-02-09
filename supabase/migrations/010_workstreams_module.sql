-- Migration: Workstreams Module
-- Description: Adds workstream templates, client assignments, verticals, and status tracking
-- Date: 2026-02-08

-- ============================================================================
-- Table: workstream_verticals (Reference data for 5 categories)
-- ============================================================================
CREATE TABLE workstream_verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  color TEXT, -- Hex color for UI (e.g., "#3B82F6")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the 5 verticals
INSERT INTO workstream_verticals (name, slug, description, display_order, color) VALUES
  ('Accounting', 'accounting', 'Core accounting operations and reconciliations', 1, '#3B82F6'),
  ('Treasury', 'treasury', 'Cash management and treasury operations', 2, '#10B981'),
  ('FP&A', 'fp-a', 'Financial planning and analysis activities', 3, '#8B5CF6'),
  ('Administration', 'administration', 'Administrative and operational tasks', 4, '#F59E0B'),
  ('Tax', 'tax', 'Tax compliance and reporting', 5, '#EF4444');

-- ============================================================================
-- Table: workstream_templates (Admin repository of reusable workstreams)
-- ============================================================================
CREATE TABLE workstream_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES workstream_verticals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  associated_software TEXT, -- Software used for this workstream
  timing TEXT CHECK (timing IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad-hoc')),
  default_sop JSONB, -- Default SOP content (can be HTML, markdown, or structured data)
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_workstream_templates_vertical ON workstream_templates(vertical_id);
CREATE INDEX idx_workstream_templates_active ON workstream_templates(is_active);
CREATE INDEX idx_workstream_templates_timing ON workstream_templates(timing);

-- ============================================================================
-- Table: client_workstreams (Client-specific workstream assignments)
-- ============================================================================
CREATE TABLE client_workstreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workstream_templates(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'yellow' CHECK (status IN ('red', 'yellow', 'green')),
  point_person_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  custom_sop JSONB, -- Client-specific SOP overrides
  notes TEXT, -- Admin notes for this assignment
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, org_id) -- One template per client
);

CREATE INDEX idx_client_workstreams_org ON client_workstreams(org_id);
CREATE INDEX idx_client_workstreams_template ON client_workstreams(template_id);
CREATE INDEX idx_client_workstreams_status ON client_workstreams(status);
CREATE INDEX idx_client_workstreams_point_person ON client_workstreams(point_person_id);
CREATE INDEX idx_client_workstreams_active ON client_workstreams(is_active);

-- ============================================================================
-- Table: workstream_status_history (Audit trail for status changes)
-- ============================================================================
CREATE TABLE workstream_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_workstream_id UUID NOT NULL REFERENCES client_workstreams(id) ON DELETE CASCADE,
  old_status TEXT CHECK (old_status IN ('red', 'yellow', 'green')),
  new_status TEXT NOT NULL CHECK (new_status IN ('red', 'yellow', 'green')),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workstream_status_history_workstream ON workstream_status_history(client_workstream_id);
CREATE INDEX idx_workstream_status_history_changed_by ON workstream_status_history(changed_by);

-- ============================================================================
-- Trigger: Auto-populate status history on status change
-- ============================================================================
CREATE OR REPLACE FUNCTION log_workstream_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO workstream_status_history (
      client_workstream_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.assigned_by, -- Use assigned_by as the user who manages this workstream
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_workstream_status_change
  AFTER UPDATE ON client_workstreams
  FOR EACH ROW
  EXECUTE FUNCTION log_workstream_status_change();

-- ============================================================================
-- Trigger: Update updated_at timestamps
-- ============================================================================
CREATE TRIGGER trigger_workstream_templates_updated_at
  BEFORE UPDATE ON workstream_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_client_workstreams_updated_at
  BEFORE UPDATE ON client_workstreams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies: workstream_verticals (Everyone can view reference data)
-- ============================================================================
ALTER TABLE workstream_verticals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verticals"
  ON workstream_verticals FOR SELECT
  USING (TRUE);

-- ============================================================================
-- RLS Policies: workstream_templates (Admin-only CRUD)
-- ============================================================================
ALTER TABLE workstream_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all templates"
  ON workstream_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create templates"
  ON workstream_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update templates"
  ON workstream_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete templates"
  ON workstream_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- RLS Policies: client_workstreams (Admin CRUD, clients view their own)
-- ============================================================================
ALTER TABLE client_workstreams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all client workstreams"
  ON client_workstreams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view their own workstreams"
  ON client_workstreams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = client_workstreams.org_id
    )
  );

CREATE POLICY "Admins can create client workstreams"
  ON client_workstreams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update client workstreams"
  ON client_workstreams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete client workstreams"
  ON client_workstreams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- RLS Policies: workstream_status_history (Same as client_workstreams)
-- ============================================================================
ALTER TABLE workstream_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all status history"
  ON workstream_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view their own workstream history"
  ON workstream_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_workstreams
      JOIN profiles ON profiles.id = auth.uid()
      WHERE client_workstreams.id = workstream_status_history.client_workstream_id
      AND profiles.org_id = client_workstreams.org_id
    )
  );

-- ============================================================================
-- Activity Log Integration
-- ============================================================================
-- Add activity log entries for workstream operations (optional, can be done in app layer)
COMMENT ON TABLE workstream_templates IS 'Repository of reusable workstream templates managed by admins';
COMMENT ON TABLE client_workstreams IS 'Client-specific workstream assignments with status tracking';
COMMENT ON TABLE workstream_status_history IS 'Audit trail for workstream status changes';
