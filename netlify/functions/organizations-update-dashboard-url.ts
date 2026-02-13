import { HandlerEvent, HandlerResponse } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'

/**
 * Update dashboard URL for all clients in an organization
 * Admin/Manager only
 */
export const handler = withMiddleware(
  async (
    event: HandlerEvent,
    { supabaseAdmin }: AuthContext
  ): Promise<HandlerResponse> => {
    if (event.httpMethod !== 'PATCH') {
      throw { statusCode: 405, message: 'Method not allowed' }
    }

    const body = JSON.parse(event.body || '{}')
    const { orgId, dashboardUrl } = body

    if (!orgId) {
      throw { statusCode: 400, message: 'Missing orgId' }
    }

    // Update dashboard_iframe_url for all clients in this org
    // Using supabaseAdmin (service role) to bypass RLS
    const { error } = await (supabaseAdmin as any)
      .from('profiles')
      .update({ dashboard_iframe_url: dashboardUrl || null })
      .eq('org_id', orgId)
      .eq('role', 'client')

    if (error) {
      console.error('Error updating dashboard URL:', error)
      throw { statusCode: 500, message: error.message }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Dashboard URL updated for all clients in organization',
      }),
    }
  },
  { requireAuth: true, requireRole: ['admin', 'manager'] }
)
