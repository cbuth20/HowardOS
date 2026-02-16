import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext, isAdminOrManagerRole } from './lib/middleware'
import { successResponse } from './lib/responses'

/**
 * Admin endpoint to update any user's profile.
 * Uses supabaseAdmin (service role) to bypass RLS.
 *
 * PATCH ?id={userId}  — Update profile fields
 * Body: { full_name?, role?, org_id?, is_active?, avatar_url?, allowed_org_ids? }
 */
export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, supabaseAdmin }: AuthContext) => {
  if (event.httpMethod !== 'PATCH') {
    throw { statusCode: 405, message: 'Method not allowed' }
  }

  const params = event.queryStringParameters || {}
  const targetUserId = params.id

  if (!targetUserId) {
    throw { statusCode: 400, message: 'User ID is required (?id=...)' }
  }

  // If updating another user's profile, require admin/manager
  if (targetUserId !== user.id && !isAdminOrManagerRole(profile.role)) {
    throw { statusCode: 403, message: 'Admin or manager access required to update other users' }
  }

  // Only admins can change roles to admin/manager
  const body = JSON.parse(event.body || '{}')
  if (body.role && ['admin', 'manager'].includes(body.role) && profile.role !== 'admin') {
    throw { statusCode: 403, message: 'Only admins can assign admin or manager roles' }
  }

  // Handle org_ids array separately
  const orgIds: string[] | undefined = body.org_ids

  // Build update object with only allowed fields
  const allowedFields = ['full_name', 'role', 'org_id', 'is_active', 'avatar_url', 'allowed_org_ids', 'is_onboarded']
  const updates: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0 && !orgIds) {
    throw { statusCode: 400, message: 'No valid fields to update' }
  }

  let updatedProfile = null

  // If org_ids provided, sync user_organizations
  if (orgIds !== undefined) {
    // Fetch existing user_organizations to find the current primary
    const { data: existingOrgs } = await (supabaseAdmin as any)
      .from('user_organizations')
      .select('org_id, is_primary')
      .eq('user_id', targetUserId)

    const currentPrimaryOrgId = existingOrgs?.find((o: any) => o.is_primary)?.org_id

    // Delete all existing user_organizations for this user
    await (supabaseAdmin as any)
      .from('user_organizations')
      .delete()
      .eq('user_id', targetUserId)

    if (orgIds.length > 0) {
      // Determine which org should be primary
      const primaryOrgId = orgIds.includes(currentPrimaryOrgId) ? currentPrimaryOrgId : orgIds[0]

      // Insert new rows
      const rows = orgIds.map(orgId => ({
        user_id: targetUserId,
        org_id: orgId,
        is_primary: orgId === primaryOrgId,
      }))

      const { error: insertError } = await (supabaseAdmin as any)
        .from('user_organizations')
        .insert(rows)

      if (insertError) {
        throw { statusCode: 500, message: 'Failed to update user organizations', details: insertError.message }
      }

      // Update profiles.org_id to primary for backward compat
      updates.org_id = primaryOrgId
    } else {
      // No orgs — clear profiles.org_id
      updates.org_id = null
    }
  }

  // Apply profile updates if any
  if (Object.keys(updates).length > 0) {
    const { data, error } = await (supabaseAdmin as any)
      .from('profiles')
      .update(updates)
      .eq('id', targetUserId)
      .select('*')
      .single()

    if (error) {
      throw { statusCode: 500, message: 'Failed to update profile', details: error.message }
    }
    updatedProfile = data
  } else {
    // Just fetch the profile if we only updated orgs
    const { data } = await (supabaseAdmin as any)
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()
    updatedProfile = data
  }

  // If org_id changed (without org_ids), update user_organizations too (backward compat)
  if (!orgIds && updates.org_id) {
    await (supabaseAdmin as any)
      .from('user_organizations')
      .upsert(
        { user_id: targetUserId, org_id: updates.org_id, is_primary: true },
        { onConflict: 'user_id,org_id' }
      )
  }

  return successResponse({ profile: updatedProfile })
}, { requireAuth: true })
