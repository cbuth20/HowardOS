import { Handler, HandlerEvent } from '@netlify/functions'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../../src/types/database.types'

export interface AuthContext {
  user: {
    id: string
    email?: string
  }
  profile: any
  userOrgs: string[]           // All org IDs the user belongs to (from user_organizations)
  supabase: any
  supabaseAdmin: any           // Service role client without user JWT (bypasses RLS)
}

export interface HandlerOptions {
  requireAuth?: boolean
  requireAdmin?: boolean
  requireTeam?: boolean        // Requires admin, manager, or user role
  requireRole?: string[]       // Requires one of the specified roles
}

// Role hierarchy helpers
export function isTeamRole(role: string): boolean {
  return ['admin', 'manager', 'user'].includes(role)
}

export function isAdminOrManagerRole(role: string): boolean {
  return ['admin', 'manager'].includes(role)
}

/**
 * Check if a user with the given role + allowed_org_ids can access a specific org
 */
export function canAccessOrg(
  role: string,
  allowedOrgIds: string[],
  userOrgs: string[],
  targetOrgId: string
): boolean {
  if (role === 'admin' || role === 'manager') return true
  if (role === 'user') {
    if (!allowedOrgIds || allowedOrgIds.length === 0) return true
    return allowedOrgIds.includes(targetOrgId)
  }
  if (role === 'client') {
    return userOrgs.includes(targetOrgId)
  }
  return false
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

      // Client with user's JWT (respects RLS based on user's token)
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )

      // Admin client without user JWT (bypasses RLS completely)
      const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
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

      // Block client_no_access from all API access
      if ((profile as any)?.role === 'client_no_access') {
        return createErrorResponse(403, 'Account does not have API access', headers)
      }

      // Role checks
      if (options.requireAdmin && !['admin'].includes((profile as any)?.role)) {
        return createErrorResponse(403, 'Admin access required', headers)
      }

      if (options.requireTeam && !['admin', 'manager', 'user'].includes((profile as any)?.role)) {
        return createErrorResponse(403, 'Team member access required', headers)
      }

      if (options.requireRole && !options.requireRole.includes((profile as any)?.role)) {
        return createErrorResponse(403, `Required role: ${options.requireRole.join(' or ')}`, headers)
      }

      // Fetch user's org memberships
      const { data: orgMemberships } = await (supabaseAdmin as any)
        .from('user_organizations')
        .select('org_id')
        .eq('user_id', user!.id)

      const userOrgs: string[] = (orgMemberships || []).map((m: any) => m.org_id)

      // Call handler with context
      const result = await handler(event, {
        user: user!,
        profile: profile! as any,
        userOrgs,
        supabase: supabase as any,
        supabaseAdmin: supabaseAdmin as any,
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
