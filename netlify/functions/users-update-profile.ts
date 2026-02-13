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

  // Build update object with only allowed fields
  const allowedFields = ['full_name', 'role', 'org_id', 'is_active', 'avatar_url', 'allowed_org_ids', 'is_onboarded']
  const updates: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    throw { statusCode: 400, message: 'No valid fields to update' }
  }

  // Use supabaseAdmin to bypass RLS
  const { data: updatedProfile, error } = await (supabaseAdmin as any)
    .from('profiles')
    .update(updates)
    .eq('id', targetUserId)
    .select('*')
    .single()

  if (error) {
    throw { statusCode: 500, message: 'Failed to update profile', details: error.message }
  }

  // If org_id changed, update user_organizations too
  if (updates.org_id) {
    // Upsert the new org as primary
    await (supabaseAdmin as any)
      .from('user_organizations')
      .upsert(
        { user_id: targetUserId, org_id: updates.org_id, is_primary: true },
        { onConflict: 'user_id,org_id' }
      )
  }

  return successResponse({ profile: updatedProfile })
}, { requireAuth: true })
