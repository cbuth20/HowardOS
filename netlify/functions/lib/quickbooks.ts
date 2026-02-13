/**
 * QuickBooks API helpers
 * - Token refresh
 * - Authenticated API requests
 * - Chart of accounts + GL transaction fetching
 */

const QB_BASE_URL = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com'

const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

export interface QBConnection {
  id: string
  org_id: string
  realm_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  company_name: string | null
  connected_by: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

/**
 * Refresh the access token if it's expired or about to expire (within 5 min)
 * Returns the updated connection data if refreshed, or null if still valid
 */
export async function refreshTokenIfNeeded(
  connection: QBConnection,
  supabaseAdmin: any
): Promise<QBConnection> {
  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt > fiveMinFromNow) {
    return connection // Token still valid
  }

  // Refresh the token
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw { statusCode: 500, message: 'QuickBooks credentials not configured' }
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }).toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('QB token refresh failed:', errorBody)
    throw { statusCode: 401, message: 'QuickBooks token refresh failed. Please reconnect.' }
  }

  const tokens: TokenResponse = await response.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Update in database
  const { error } = await supabaseAdmin
    .from('quickbooks_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: newExpiresAt,
    })
    .eq('id', connection.id)

  if (error) {
    console.error('Failed to save refreshed tokens:', error)
    throw { statusCode: 500, message: 'Failed to save refreshed tokens' }
  }

  return {
    ...connection,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: newExpiresAt,
  }
}

/**
 * Make an authenticated request to the QuickBooks API
 */
export async function qbApiRequest(
  connection: QBConnection,
  endpoint: string,
  method: string = 'GET'
): Promise<any> {
  const url = `${QB_BASE_URL}/v3/company/${connection.realm_id}${endpoint}`

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`QB API error (${response.status}):`, errorBody)

    if (response.status === 401) {
      throw { statusCode: 401, message: 'QuickBooks authorization expired. Please reconnect.' }
    }

    throw {
      statusCode: response.status,
      message: `QuickBooks API error: ${response.statusText}`,
      details: errorBody,
    }
  }

  return response.json()
}

/**
 * Fetch chart of accounts from QuickBooks
 */
export async function fetchChartOfAccounts(connection: QBConnection): Promise<any> {
  const query = encodeURIComponent("SELECT * FROM Account MAXRESULTS 1000")
  const data = await qbApiRequest(connection, `/query?query=${query}`)
  return data.QueryResponse?.Account || []
}

/**
 * Fetch General Ledger report (transactions) from QuickBooks
 */
export async function fetchGeneralLedger(
  connection: QBConnection,
  startDate: string,
  endDate: string
): Promise<any> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    minorversion: '75',
  })
  const data = await qbApiRequest(connection, `/reports/GeneralLedger?${params}`)
  return data
}

/**
 * Fetch Profit & Loss report from QuickBooks
 */
export async function fetchProfitAndLoss(
  connection: QBConnection,
  startDate: string,
  endDate: string
): Promise<any> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    minorversion: '75',
  })
  const data = await qbApiRequest(connection, `/reports/ProfitAndLoss?${params}`)
  return data
}

/**
 * Fetch company info from QuickBooks (used during connection to get company name)
 */
export async function fetchCompanyInfo(connection: QBConnection): Promise<any> {
  const data = await qbApiRequest(connection, `/companyinfo/${connection.realm_id}`)
  return data.CompanyInfo
}

/**
 * Build the Intuit OAuth authorization URL
 */
export function buildAuthUrl(state: string): string {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw { statusCode: 500, message: 'QuickBooks OAuth not configured' }
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: redirectUri,
    state,
  })

  return `https://appcenter.intuit.com/connect/oauth2?${params}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw { statusCode: 500, message: 'QuickBooks OAuth not configured' }
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('QB token exchange failed:', errorBody)
    throw { statusCode: 400, message: 'Failed to exchange QuickBooks authorization code' }
  }

  return response.json()
}
