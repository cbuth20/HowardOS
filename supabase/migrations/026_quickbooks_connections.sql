-- =====================================================
-- QUICKBOOKS CONNECTIONS
-- One QB connection per client organization
-- =====================================================

CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  realm_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  company_name TEXT,
  connected_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quickbooks_connections_org_id_unique UNIQUE (org_id)
);

CREATE INDEX idx_quickbooks_connections_org_id ON quickbooks_connections(org_id);

-- Updated_at trigger
CREATE TRIGGER update_quickbooks_connections_updated_at
  BEFORE UPDATE ON quickbooks_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: admin/manager only
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manager_select_qb_connections"
  ON quickbooks_connections FOR SELECT
  USING (public.is_admin_or_manager());

CREATE POLICY "admin_manager_insert_qb_connections"
  ON quickbooks_connections FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "admin_manager_update_qb_connections"
  ON quickbooks_connections FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "admin_manager_delete_qb_connections"
  ON quickbooks_connections FOR DELETE
  USING (public.is_admin_or_manager());

COMMENT ON TABLE quickbooks_connections IS 'Stores QuickBooks OAuth connections per client organization';
