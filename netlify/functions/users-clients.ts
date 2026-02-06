import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'

export const handler = withMiddleware(async (event: HandlerEvent, { profile, supabase }: AuthContext) => {
  // Get all client users from other organizations
  const { data: clients, error: clientsError } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      role,
      org_id,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq('role', 'client')
    .neq('org_id', profile.org_id)
    .eq('is_active', true)
    .order('full_name')

  if (clientsError) {
    throw { statusCode: 500, message: 'Failed to get clients', details: clientsError.message }
  }

  // Group by organization
  const clientsByOrg = (clients || []).reduce((acc: any, client: any) => {
    const orgName = client.organizations?.name || 'Unknown'
    if (!acc[orgName]) {
      acc[orgName] = []
    }
    acc[orgName].push({
      id: client.id,
      email: client.email,
      full_name: client.full_name,
      role: client.role,
      org_id: client.org_id,
      org_name: orgName,
    })
    return acc
  }, {})

  return successResponse({
    clients: clients || [],
    clientsByOrg,
  })
}, { requireAuth: true, requireAdmin: true })
