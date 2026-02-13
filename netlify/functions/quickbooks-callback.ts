import { Handler, HandlerEvent } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { exchangeCodeForTokens, fetchCompanyInfo } from './lib/quickbooks'

/**
 * GET /api/quickbooks-callback
 * Handles the OAuth callback from Intuit.
 * Query params: code, realmId, state
 *
 * This endpoint does NOT use withMiddleware because it's called by
 * Intuit's redirect — no Bearer token is present. Instead, the user_id
 * is encoded in the state parameter from the initial auth request.
 */
export const handler: Handler = async (event: HandlerEvent) => {
  const params = event.queryStringParameters || {}
  const { code, realmId, state } = params

  // Determine the app's base URL for redirects
  const appBaseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888'

  if (!code || !realmId || !state) {
    return {
      statusCode: 302,
      headers: {
        Location: `${appBaseUrl}/tools/transactions?error=missing_params`,
      },
      body: '',
    }
  }

  try {
    // Decode state to get org_id and user_id
    const statePayload = JSON.parse(Buffer.from(state, 'base64url').toString())
    const { org_id, user_id } = statePayload

    if (!org_id || !user_id) {
      return {
        statusCode: 302,
        headers: {
          Location: `${appBaseUrl}/tools/transactions?error=invalid_state`,
        },
        body: '',
      }
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Create admin Supabase client (no user JWT available in callback)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch company name from QuickBooks
    let companyName: string | null = null
    try {
      const tempConnection = {
        id: '',
        org_id,
        realm_id: realmId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        company_name: null,
        connected_by: user_id,
      }
      const companyInfo = await fetchCompanyInfo(tempConnection)
      companyName = companyInfo?.CompanyName || null
    } catch (e) {
      console.warn('Could not fetch QB company name:', e)
    }

    // Upsert the connection (one per org)
    const { error } = await supabaseAdmin
      .from('quickbooks_connections')
      .upsert(
        {
          org_id,
          realm_id: realmId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          company_name: companyName,
          connected_by: user_id,
        },
        { onConflict: 'org_id' }
      )

    if (error) {
      console.error('Failed to store QB connection:', error)
      return {
        statusCode: 302,
        headers: {
          Location: `${appBaseUrl}/tools/transactions?error=storage_failed`,
        },
        body: '',
      }
    }

    return {
      statusCode: 302,
      headers: {
        Location: `${appBaseUrl}/tools/transactions?connected=true`,
      },
      body: '',
    }
  } catch (error: any) {
    console.error('QB callback error:', error)
    return {
      statusCode: 302,
      headers: {
        Location: `${appBaseUrl}/tools/transactions?error=auth_failed`,
      },
      body: '',
    }
  }
}
