import { Handler } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse, errorResponse } from './lib/responses'

/**
 * GET /api/workstream-verticals
 * Returns all workstream verticals (reference data)
 * Public access - no auth required
 */
export const handler: Handler = withMiddleware(async (event, context: AuthContext) => {
  const supabase = context.supabase

  // Only support GET
  if (event.httpMethod !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Fetch all verticals ordered by display_order
    const { data: verticals, error } = await supabase
      .from('workstream_verticals')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching verticals:', error)
      return errorResponse('Failed to fetch verticals')
    }

    return successResponse({ verticals })
  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse('Internal server error')
  }
}, { requireAuth: false })
