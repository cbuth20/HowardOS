-- ============================================================
-- Bulk Upload: workstream_templates
-- ============================================================
-- Inserts 36 workstream templates.
-- Verticals must already exist in workstream_verticals.
-- ============================================================

-- Accounting (7)
INSERT INTO workstream_templates (vertical_id, name, description, display_order)
VALUES
  ((SELECT id FROM workstream_verticals WHERE slug = 'accounting'), 'Transaction Coding', 'Review bank and credit card transactions and categorize to the general ledger', 1),
  ((SELECT id FROM workstream_verticals WHERE slug = 'accounting'), 'Chart of Accounts Maintenance', 'Maintain and update chart of accounts and account mappings', 2),
  ((SELECT id FROM workstream_verticals WHERE slug = 'accounting'), 'Bank & Credit Card Reconciliations', 'Reconcile cash and card accounts to statements', 3),
  ((SELECT id FROM workstream_verticals WHERE slug = 'accounting'), 'Accruals & Adjusting Entries', 'Record accruals deferrals and other adjusting journal entries', 4),
  ((SELECT id FROM workstream_verticals WHERE slug = 'accounting'), 'Depreciation & Amortization Schedules', 'Track fixed assets and record depreciation schedules', 5),
  ((SELECT id FROM workstream_verticals WHERE slug = 'accounting'), 'Intercompany Coding & Reconciliations', 'Record and reconcile intercompany transactions', 6),
  ((SELECT id FROM workstream_verticals WHERE slug = 'accounting'), 'Month-End Close Review', 'Perform monthly close procedures and produce financial statements', 7);

-- Treasury (6)
INSERT INTO workstream_templates (vertical_id, name, description, display_order)
VALUES
  ((SELECT id FROM workstream_verticals WHERE slug = 'treasury'), 'Accounts Payable Processing', 'Process vendor bills and prepare payments', 1),
  ((SELECT id FROM workstream_verticals WHERE slug = 'treasury'), 'Accounts Receivable Invoicing', 'Generate and send customer invoices', 2),
  ((SELECT id FROM workstream_verticals WHERE slug = 'treasury'), 'Vendor Management & 1099s', 'Maintain vendor records and payment instructions', 3),
  ((SELECT id FROM workstream_verticals WHERE slug = 'treasury'), 'Collections Support', 'Monitor receivables and follow up on past-due balances', 4),
  ((SELECT id FROM workstream_verticals WHERE slug = 'treasury'), 'Cash Balance Reporting', 'Provide regular cash position updates', 5),
  ((SELECT id FROM workstream_verticals WHERE slug = 'treasury'), 'Treasury Controls & Approvals', 'Implement payment approvals and control processes', 6);

-- FP&A (9)
INSERT INTO workstream_templates (vertical_id, name, description, display_order)
VALUES
  ((SELECT id FROM workstream_verticals WHERE slug = 'fp-a'), 'Financial Statement Preparation', 'Prepare monthly balance sheet income statement and cash flow', 1),
  ((SELECT id FROM workstream_verticals WHERE slug = 'fp-a'), 'Monthly Financial Commentary', 'Provide month-over-month and budget variance commentary', 2),
  ((SELECT id FROM workstream_verticals WHERE slug = 'fp-a'), 'Budget Preparation & Maintenance', 'Build annual operating budget with management', 3),
  ((SELECT id FROM workstream_verticals WHERE slug = 'fp-a'), 'Forecast Updating & Reporting', 'Maintain rolling financial forecasts', 4),
  ((SELECT id FROM workstream_verticals WHERE slug = 'fp-a'), 'KPI Dashboards', 'Track and report key performance indicators', 5),
  ((SELECT id FROM workstream_verticals WHERE slug = 'fp-a'), 'Cash Flow Forecasting', 'Prepare short- and medium-term cash projections', 6),
  ((SELECT id FROM workstream_verticals WHERE slug = 'fp-a'), 'Board / Investor Reporting', 'Prepare investor or board reporting packages', 7),
  ((SELECT id FROM workstream_verticals WHERE slug = 'fp-a'), 'Scenario & Sensitivity Analysis', 'Model financial scenarios and business cases', 8),
  ((SELECT id FROM workstream_verticals WHERE slug = 'fp-a'), 'Departmental Reporting', 'Prepare functional or location-level performance reports', 9);

-- Administration (7)
INSERT INTO workstream_templates (vertical_id, name, description, display_order)
VALUES
  ((SELECT id FROM workstream_verticals WHERE slug = 'administration'), 'Payroll Processing', 'Run payroll and manage payroll reports', 1),
  ((SELECT id FROM workstream_verticals WHERE slug = 'administration'), 'Payroll Compliance', 'Monitor payroll tax filings and compliance items', 2),
  ((SELECT id FROM workstream_verticals WHERE slug = 'administration'), 'Employee Onboarding Support', 'Assist with setup of new hires in systems', 3),
  ((SELECT id FROM workstream_verticals WHERE slug = 'administration'), 'Expense Reimbursement Processing', 'Review and process employee reimbursements', 4),
  ((SELECT id FROM workstream_verticals WHERE slug = 'administration'), 'System & Access Administration', 'Maintain user access across finance systems', 5),
  ((SELECT id FROM workstream_verticals WHERE slug = 'administration'), 'Document & Mailbox Management', 'Monitor finance inboxes and manage documents', 6),
  ((SELECT id FROM workstream_verticals WHERE slug = 'administration'), 'Compliance Calendar Management', 'Track key filing and compliance deadlines', 7);

-- Tax (7)
INSERT INTO workstream_templates (vertical_id, name, description, display_order)
VALUES
  ((SELECT id FROM workstream_verticals WHERE slug = 'tax'), 'Sales Tax Filings', 'Prepare and file sales and use tax returns', 1),
  ((SELECT id FROM workstream_verticals WHERE slug = 'tax'), 'Income Tax Package Preparation', 'Assemble books and schedules for income tax returns', 2),
  ((SELECT id FROM workstream_verticals WHERE slug = 'tax'), '1099 Preparation & Filing', 'Prepare and file annual 1099 forms', 3),
  ((SELECT id FROM workstream_verticals WHERE slug = 'tax'), 'Nexus & Registration Support', 'Assist with state registrations and tax setup', 4),
  ((SELECT id FROM workstream_verticals WHERE slug = 'tax'), 'Tax Notice Management', 'Review and respond to tax notices', 5),
  ((SELECT id FROM workstream_verticals WHERE slug = 'tax'), 'Estimated Tax Planning', 'Calculate and plan estimated tax payments', 6),
  ((SELECT id FROM workstream_verticals WHERE slug = 'tax'), 'CPA Coordination', 'Coordinate with external tax advisors and provide support schedules', 7);

-- Verify results
SELECT wv.name AS vertical, COUNT(wt.id) AS template_count
FROM workstream_verticals wv
LEFT JOIN workstream_templates wt ON wt.vertical_id = wv.id
GROUP BY wv.name, wv.display_order
ORDER BY wv.display_order;
