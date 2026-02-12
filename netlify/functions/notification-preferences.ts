import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'

/**
 * GET  — Get current user's notification preferences
 * PATCH — Update current user's notification preferences
 */
export const handler = withMiddleware(async (event: HandlerEvent, { user, supabaseAdmin }: AuthContext) => {
  const method = event.httpMethod

  if (method === 'GET') {
    return handleGet(user, supabaseAdmin)
  }
  if (method === 'PATCH') {
    return handleUpdate(event, user, supabaseAdmin)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true })

async function handleGet(user: any, supabase: any) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code === 'PGRST116') {
    // No preferences yet — return defaults
    return successResponse({
      preferences: {
        user_id: user.id,
        task_assigned: true,
        task_status_changed: true,
        task_comment_added: true,
        task_mentioned: true,
        file_uploaded: true,
      }
    })
  }

  if (error) {
    throw { statusCode: 500, message: 'Failed to fetch preferences', details: error.message }
  }

  return successResponse({ preferences: data })
}

async function handleUpdate(event: HandlerEvent, user: any, supabase: any) {
  const body = JSON.parse(event.body || '{}')

  // Only allow updating known preference fields
  const allowedFields = [
    'task_assigned',
    'task_status_changed',
    'task_comment_added',
    'task_mentioned',
    'file_uploaded',
  ]

  const updates: Record<string, boolean> = {}
  for (const field of allowedFields) {
    if (typeof body[field] === 'boolean') {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    throw { statusCode: 400, message: 'No valid preference fields provided' }
  }

  // Upsert — create if doesn't exist, update if it does
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: user.id, ...updates },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()

  if (error) {
    throw { statusCode: 500, message: 'Failed to update preferences', details: error.message }
  }

  return successResponse({ preferences: data })
}
