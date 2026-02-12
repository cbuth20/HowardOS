-- =====================================================
-- SOFTWARE CATALOG
-- Provides a dropdown of common accounting/business software
-- Users can also add custom software entries
-- =====================================================

CREATE TABLE software_catalog (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_software_catalog_name ON software_catalog(name);
CREATE INDEX idx_software_catalog_category ON software_catalog(category);

-- Seed common accounting/business software
INSERT INTO software_catalog (name, category) VALUES
  ('QuickBooks Online', 'Accounting'),
  ('QuickBooks Desktop', 'Accounting'),
  ('Xero', 'Accounting'),
  ('NetSuite', 'ERP'),
  ('Sage Intacct', 'Accounting'),
  ('FreshBooks', 'Accounting'),
  ('Wave', 'Accounting'),
  ('Bill.com', 'AP/AR'),
  ('BILL', 'AP/AR'),
  ('Ramp', 'Expense Management'),
  ('Brex', 'Expense Management'),
  ('Expensify', 'Expense Management'),
  ('Gusto', 'Payroll'),
  ('ADP', 'Payroll'),
  ('Paychex', 'Payroll'),
  ('Rippling', 'HR/Payroll'),
  ('Justworks', 'HR/Payroll'),
  ('Excel', 'Spreadsheet'),
  ('Google Sheets', 'Spreadsheet'),
  ('Stripe', 'Payments'),
  ('Square', 'Payments'),
  ('Shopify', 'E-Commerce'),
  ('Amazon Seller Central', 'E-Commerce'),
  ('Salesforce', 'CRM'),
  ('HubSpot', 'CRM'),
  ('Avalara', 'Tax'),
  ('TaxJar', 'Tax'),
  ('Carta', 'Equity'),
  ('Divvy', 'Expense Management'),
  ('Mercury', 'Banking'),
  ('Relay', 'Banking'),
  ('Plaid', 'Banking'),
  ('Dext (Receipt Bank)', 'Document Management'),
  ('Hubdoc', 'Document Management'),
  ('LivePlan', 'FP&A'),
  ('Jirav', 'FP&A'),
  ('Mosaic', 'FP&A'),
  ('Vena', 'FP&A'),
  ('Planful', 'FP&A'),
  ('FloQast', 'Close Management'),
  ('BlackLine', 'Close Management')
ON CONFLICT (name) DO NOTHING;

-- RLS: Anyone can read software catalog, team can manage
ALTER TABLE software_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view software catalog"
  ON software_catalog FOR SELECT
  USING (true);

CREATE POLICY "Team can manage software catalog"
  ON software_catalog FOR ALL
  USING (public.is_team_member());

COMMENT ON TABLE software_catalog IS 'Reference table of common business/accounting software for workstream entries';
