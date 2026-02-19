import { HandlerEvent, HandlerResponse } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'

/**
 * Delete an organization (admin only)
 */
export const handler = withMiddleware(
  async (
    event: HandlerEvent,
    { supabaseAdmin }: AuthContext
  ): Promise<HandlerResponse> => {
    if (event.httpMethod !== 'DELETE') {
      throw { statusCode: 405, message: 'Method not allowed' }
    }

    const body = JSON.parse(event.body || '{}')
    const { orgId } = body

    if (!orgId) {
      throw { statusCode: 400, message: 'Missing orgId' }
    }

    const { error } = await (supabaseAdmin as any)
      .from('organizations')
      .delete()
      .eq('id', orgId)

    if (error) {
      console.error('Error deleting organization:', error)
      throw { statusCode: 500, message: error.message }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    }
  },
  { requireAuth: true, requireRole: ['admin'] }
)
