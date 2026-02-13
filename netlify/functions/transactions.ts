import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'
import {
  refreshTokenIfNeeded,
  fetchChartOfAccounts,
  fetchGeneralLedger,
  fetchProfitAndLoss,
  QBConnection,
} from './lib/quickbooks'

/**
 * Transactions API
 * POST /api/transactions — Pull data from QuickBooks for an org
 *   Body: { org_id, start_date, end_date, report_type? }
 *   report_type: 'general_ledger' | 'profit_and_loss' (default: 'general_ledger')
 *
 * GET /api/transactions?org_id=... — Get chart of accounts for an org
 */
export const handler = withMiddleware(async (event: HandlerEvent, { supabaseAdmin }: AuthContext) => {
  const method = event.httpMethod

  if (method === 'POST') {
    return handlePull(event, supabaseAdmin)
  }

  if (method === 'GET') {
    return handleGetAccounts(event, supabaseAdmin)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireRole: ['admin', 'manager'] })

/**
 * Pull transactions from QuickBooks
 */
async function handlePull(event: HandlerEvent, supabaseAdmin: any) {
  const body = JSON.parse(event.body || '{}')
  const { org_id, start_date, end_date, report_type = 'general_ledger' } = body

  if (!org_id || !start_date || !end_date) {
    throw { statusCode: 400, message: 'org_id, start_date, and end_date are required' }
  }

  // Look up QB connection for this org
  const { data: connection, error: connError } = await supabaseAdmin
    .from('quickbooks_connections')
    .select('*')
    .eq('org_id', org_id)
    .single()

  if (connError || !connection) {
    throw { statusCode: 404, message: 'No QuickBooks connection found for this organization' }
  }

  // Refresh token if needed
  const freshConnection = await refreshTokenIfNeeded(connection as QBConnection, supabaseAdmin)

  // Fetch chart of accounts
  const accounts = await fetchChartOfAccounts(freshConnection)

  // Fetch the requested report
  let reportData: any
  if (report_type === 'profit_and_loss') {
    reportData = await fetchProfitAndLoss(freshConnection, start_date, end_date)
  } else {
    reportData = await fetchGeneralLedger(freshConnection, start_date, end_date)
  }

  return successResponse({
    org_id,
    report_type,
    date_range: { start_date, end_date },
    accounts,
    report: reportData,
  })
}

/**
 * Get chart of accounts from QuickBooks (live pull)
 */
async function handleGetAccounts(event: HandlerEvent, supabaseAdmin: any) {
  const params = event.queryStringParameters || {}
  const { org_id } = params

  if (!org_id) {
    throw { statusCode: 400, message: 'org_id is required' }
  }

  // Look up QB connection
  const { data: connection, error: connError } = await supabaseAdmin
    .from('quickbooks_connections')
    .select('*')
    .eq('org_id', org_id)
    .single()

  if (connError || !connection) {
    throw { statusCode: 404, message: 'No QuickBooks connection found for this organization' }
  }

  // Refresh token if needed
  const freshConnection = await refreshTokenIfNeeded(connection as QBConnection, supabaseAdmin)

  // Fetch chart of accounts
  const accounts = await fetchChartOfAccounts(freshConnection)

  return successResponse({ org_id, accounts })
}
