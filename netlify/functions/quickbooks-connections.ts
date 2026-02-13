import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'

/**
 * QuickBooks Connections API
 * GET  /api/quickbooks-connections?org_id=...  — Get connection for an org
 * GET  /api/quickbooks-connections              — Get all connections
 * DELETE /api/quickbooks-connections?id=...     — Disconnect
 */
export const handler = withMiddleware(async (event: HandlerEvent, { supabaseAdmin }: AuthContext) => {
  const method = event.httpMethod
  const params = event.queryStringParameters || {}

  if (method === 'GET') {
    return handleGet(params, supabaseAdmin)
  }

  if (method === 'DELETE') {
    return handleDelete(params, supabaseAdmin)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireRole: ['admin', 'manager'] })

async function handleGet(params: Record<string, string | undefined>, supabaseAdmin: any) {
  const { org_id } = params

  let query = supabaseAdmin
    .from('quickbooks_connections')
    .select(`
      id, org_id, realm_id, company_name, connected_by, created_at, updated_at,
      token_expires_at,
      organization:organizations(id, name, slug)
    `)

  if (org_id) {
    query = query.eq('org_id', org_id)
  }

  const { data: connections, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw { statusCode: 500, message: 'Failed to fetch connections', details: error.message }
  }

  return successResponse({ connections: connections || [] })
}

async function handleDelete(params: Record<string, string | undefined>, supabaseAdmin: any) {
  const { id } = params

  if (!id) {
    throw { statusCode: 400, message: 'Connection id is required' }
  }

  const { error } = await supabaseAdmin
    .from('quickbooks_connections')
    .delete()
    .eq('id', id)

  if (error) {
    throw { statusCode: 500, message: 'Failed to disconnect', details: error.message }
  }

  return successResponse({ message: 'QuickBooks disconnected' })
}
