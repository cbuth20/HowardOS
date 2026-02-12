import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'

/**
 * CRUD for user organization memberships
 *
 * GET ?userId={id}           — List all orgs for a user
 * GET ?orgId={id}            — List all users in an org (with org membership info)
 * POST                       — Add user to org { user_id, org_id, is_primary? }
 * PATCH ?id={id}             — Update membership (set primary) { is_primary }
 * DELETE ?id={id}            — Remove membership
 * DELETE ?userId={id}&orgId={id} — Remove by user+org combo
 */
export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, supabaseAdmin }: AuthContext) => {
  const method = event.httpMethod
  const params = event.queryStringParameters || {}

  if (method === 'GET') {
    return handleGet(params, supabaseAdmin)
  }
  if (method === 'POST') {
    return handleCreate(event, supabaseAdmin)
  }
  if (method === 'PATCH') {
    return handleUpdate(event, params, supabaseAdmin)
  }
  if (method === 'DELETE') {
    return handleDelete(params, supabaseAdmin)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true, requireRole: ['admin', 'manager'] })

async function handleGet(params: Record<string, string | undefined>, supabase: any) {
  if (params.userId) {
    // Get all orgs for a user
    const { data: memberships, error } = await supabase
      .from('user_organizations')
      .select(`
        id,
        org_id,
        is_primary,
        created_at,
        organization:organizations(id, name, slug, logo_url)
      `)
      .eq('user_id', params.userId)
      .order('is_primary', { ascending: false })

    if (error) {
      throw { statusCode: 500, message: 'Failed to fetch memberships', details: error.message }
    }

    return successResponse({ memberships: memberships || [] })
  }

  if (params.orgId) {
    // Get all users in an org
    const { data: memberships, error } = await supabase
      .from('user_organizations')
      .select(`
        id,
        user_id,
        is_primary,
        created_at,
        profile:profiles(id, email, full_name, role, avatar_url, is_active)
      `)
      .eq('org_id', params.orgId)

    if (error) {
      throw { statusCode: 500, message: 'Failed to fetch memberships', details: error.message }
    }

    return successResponse({ memberships: memberships || [] })
  }

  throw { statusCode: 400, message: 'userId or orgId parameter required' }
}

async function handleCreate(event: HandlerEvent, supabase: any) {
  const body = JSON.parse(event.body || '{}')
  const { user_id, org_id, is_primary } = body

  if (!user_id || !org_id) {
    throw { statusCode: 400, message: 'user_id and org_id are required' }
  }

  // If setting as primary, unset other primaries first
  if (is_primary) {
    await supabase
      .from('user_organizations')
      .update({ is_primary: false })
      .eq('user_id', user_id)
      .eq('is_primary', true)
  }

  const { data: membership, error } = await supabase
    .from('user_organizations')
    .upsert(
      { user_id, org_id, is_primary: is_primary || false },
      { onConflict: 'user_id,org_id' }
    )
    .select(`
      id,
      org_id,
      is_primary,
      created_at,
      organization:organizations(id, name, slug, logo_url)
    `)
    .single()

  if (error) {
    throw { statusCode: 500, message: 'Failed to create membership', details: error.message }
  }

  return { statusCode: 201, data: successResponse({ membership }) }
}

async function handleUpdate(event: HandlerEvent, params: Record<string, string | undefined>, supabase: any) {
  const membershipId = params.id
  if (!membershipId) {
    throw { statusCode: 400, message: 'Membership ID required' }
  }

  const body = JSON.parse(event.body || '{}')

  // Get the membership first to know the user_id
  const { data: existing, error: fetchError } = await supabase
    .from('user_organizations')
    .select('user_id')
    .eq('id', membershipId)
    .single()

  if (fetchError || !existing) {
    throw { statusCode: 404, message: 'Membership not found' }
  }

  // If setting as primary, unset other primaries first
  if (body.is_primary) {
    await supabase
      .from('user_organizations')
      .update({ is_primary: false })
      .eq('user_id', existing.user_id)
      .eq('is_primary', true)
  }

  const { data: membership, error } = await supabase
    .from('user_organizations')
    .update({ is_primary: body.is_primary })
    .eq('id', membershipId)
    .select(`
      id,
      org_id,
      is_primary,
      created_at,
      organization:organizations(id, name, slug, logo_url)
    `)
    .single()

  if (error) {
    throw { statusCode: 500, message: 'Failed to update membership', details: error.message }
  }

  return successResponse({ membership })
}

async function handleDelete(params: Record<string, string | undefined>, supabase: any) {
  // Delete by ID or by user+org combo
  if (params.id) {
    const { error } = await supabase
      .from('user_organizations')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw { statusCode: 500, message: 'Failed to delete membership', details: error.message }
    }
  } else if (params.userId && params.orgId) {
    const { error } = await supabase
      .from('user_organizations')
      .delete()
      .eq('user_id', params.userId)
      .eq('org_id', params.orgId)

    if (error) {
      throw { statusCode: 500, message: 'Failed to delete membership', details: error.message }
    }
  } else {
    throw { statusCode: 400, message: 'id or userId+orgId parameters required' }
  }

  return successResponse({ message: 'Membership removed successfully' })
}
