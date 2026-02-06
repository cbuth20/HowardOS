import { Handler, HandlerEvent } from '@netlify/functions'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../../src/types/database.types'

export interface AuthContext {
  user: {
    id: string
    email?: string
  }
  profile: any
  supabase: any
}

export interface HandlerOptions {
  requireAuth?: boolean
  requireAdmin?: boolean
}

/**
 * Wraps a Netlify function with auth, CORS, and error handling
 */
export function withMiddleware(
  handler: (event: HandlerEvent, context: AuthContext) => Promise<any>,
  options: HandlerOptions = {}
): Handler {
  return async (event: HandlerEvent): Promise<any> => {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Content-Type': 'application/json',
    }

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' }
    }

    try {
      // Auth check
      const authHeader = event.headers.authorization || event.headers.Authorization
      if (!authHeader && options.requireAuth !== false) {
        return createErrorResponse(401, 'Unauthorized', headers)
      }

      const token = authHeader?.replace('Bearer ', '')
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )

      // Get user
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if ((authError || !user) && options.requireAuth !== false) {
        return createErrorResponse(401, 'Invalid token', headers)
      }

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()

      if (!profile && options.requireAuth !== false) {
        return createErrorResponse(404, 'Profile not found', headers)
      }

      // Admin check
      if (options.requireAdmin && (profile as any)?.role !== 'admin') {
        return createErrorResponse(403, 'Admin access required', headers)
      }

      // Call handler with context
      const result = await handler(event, {
        user: user!,
        profile: profile! as any,
        supabase: supabase as any,
      })

      return {
        statusCode: result.statusCode || 200,
        headers,
        body: JSON.stringify(result.data || result),
      }
    } catch (error: any) {
      console.error('Handler error:', error)
      return createErrorResponse(
        error.statusCode || 500,
        error.message || 'Internal server error',
        headers,
        { details: error.details }
      )
    }
  }
}

function createErrorResponse(
  statusCode: number,
  message: string,
  headers: any,
  extra?: any
) {
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      success: false,
      error: message,
      ...extra,
    }),
  }
}
