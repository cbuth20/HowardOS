import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'
import { buildAuthUrl } from './lib/quickbooks'

/**
 * POST /api/quickbooks-auth
 * Initiates QuickBooks OAuth flow.
 * Body: { org_id: string }
 * Returns: { authUrl: string }
 *
 * The state parameter encodes the org_id so the callback knows
 * which organization to associate the connection with.
 */
export const handler = withMiddleware(async (event: HandlerEvent, { user, profile }: AuthContext) => {
  if (event.httpMethod !== 'POST') {
    throw { statusCode: 405, message: 'Method not allowed' }
  }

  const body = JSON.parse(event.body || '{}')
  const { org_id } = body

  if (!org_id) {
    throw { statusCode: 400, message: 'org_id is required' }
  }

  // Encode org_id and user_id in state for the callback
  const statePayload = JSON.stringify({ org_id, user_id: user.id })
  const state = Buffer.from(statePayload).toString('base64url')

  const authUrl = buildAuthUrl(state)

  return successResponse({ authUrl })
}, { requireRole: ['admin', 'manager'] })
