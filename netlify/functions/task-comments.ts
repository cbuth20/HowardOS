import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext, isTeamRole } from './lib/middleware'
import { successResponse } from './lib/responses'

const COMMENT_SELECT_QUERY = `
  *,
  user:profiles!task_comments_user_id_fkey(
    id, full_name, email, avatar_url, role
  )
`

/**
 * GET ?taskId={id}         — List comments for a task
 * POST                     — Create comment { task_id, content, is_internal? }
 * DELETE ?id={id}          — Delete comment
 */
export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, supabaseAdmin }: AuthContext) => {
  const method = event.httpMethod
  const params = event.queryStringParameters || {}

  if (method === 'GET') {
    return handleGetComments(params, profile, supabaseAdmin)
  }
  if (method === 'POST') {
    return handleCreateComment(event, user, profile, supabaseAdmin)
  }
  if (method === 'DELETE') {
    return handleDeleteComment(params, user, profile, supabaseAdmin)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true })

async function handleGetComments(params: Record<string, string | undefined>, profile: any, supabase: any) {
  const taskId = params.taskId
  if (!taskId) {
    throw { statusCode: 400, message: 'taskId is required' }
  }

  let query = supabase
    .from('task_comments')
    .select(COMMENT_SELECT_QUERY)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  // Clients can't see internal comments
  if (!isTeamRole(profile.role)) {
    query = query.eq('is_internal', false)
  }

  const { data: comments, error } = await query

  if (error) {
    throw { statusCode: 500, message: 'Failed to fetch comments', details: error.message }
  }

  return successResponse({ comments: comments || [] })
}

/**
 * Parse @mentions from comment content.
 * Matches patterns like @[User Name](userId) or simple @userId
 */
function parseMentions(content: string, allUsers: any[]): string[] {
  const mentionIds: string[] = []

  // Pattern: @[Name](uuid)
  const bracketPattern = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/g
  let match
  while ((match = bracketPattern.exec(content)) !== null) {
    mentionIds.push(match[2])
  }

  // Pattern: @name — match against user names
  if (mentionIds.length === 0 && content.includes('@')) {
    const atPattern = /@(\w+(?:\s\w+)?)/g
    while ((match = atPattern.exec(content)) !== null) {
      const mentionText = match[1].toLowerCase()
      const matchedUser = allUsers.find(
        (u: any) =>
          u.full_name?.toLowerCase().includes(mentionText) ||
          u.email?.toLowerCase().startsWith(mentionText)
      )
      if (matchedUser) {
        mentionIds.push(matchedUser.id)
      }
    }
  }

  return [...new Set(mentionIds)]
}

async function handleCreateComment(event: HandlerEvent, user: any, profile: any, supabase: any) {
  const body = JSON.parse(event.body || '{}')
  const { task_id, content, is_internal } = body

  if (!task_id) {
    throw { statusCode: 400, message: 'task_id is required' }
  }
  if (!content?.trim()) {
    throw { statusCode: 400, message: 'content is required' }
  }

  // Only team members can post internal comments
  const commentIsInternal = is_internal && isTeamRole(profile.role) ? true : false

  // Verify task exists and user has access
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, org_id, title, assigned_to, created_by')
    .eq('id', task_id)
    .single()

  if (taskError || !task) {
    throw { statusCode: 404, message: 'Task not found' }
  }

  // Get all users for mention resolution
  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_active', true)

  // Parse mentions from content
  const mentions = parseMentions(content.trim(), allUsers || [])

  // Create comment
  const { data: comment, error: createError } = await supabase
    .from('task_comments')
    .insert({
      task_id,
      user_id: user.id,
      content: content.trim(),
      mentions,
      is_internal: commentIsInternal,
    })
    .select(COMMENT_SELECT_QUERY)
    .single()

  if (createError) {
    throw { statusCode: 500, message: 'Failed to create comment', details: createError.message }
  }

  // Send notification emails (non-blocking)
  try {
    await sendCommentNotifications(comment, task, profile, mentions, supabase)
  } catch (emailError) {
    console.error('Error sending comment notifications:', emailError)
  }

  return { statusCode: 201, data: successResponse({ comment }) }
}

async function sendCommentNotifications(
  comment: any,
  task: any,
  commenter: any,
  mentions: string[],
  supabase: any
) {
  // Get all users who should be notified:
  // 1. Task assignee (if not the commenter)
  // 2. Task creator (if not the commenter)
  // 3. Mentioned users
  const notifyUserIds = new Set<string>()

  if (task.assigned_to && task.assigned_to !== commenter.id) {
    notifyUserIds.add(task.assigned_to)
  }
  if (task.created_by && task.created_by !== commenter.id) {
    notifyUserIds.add(task.created_by)
  }
  for (const mentionId of mentions) {
    if (mentionId !== commenter.id) {
      notifyUserIds.add(mentionId)
    }
  }

  if (notifyUserIds.size === 0) return

  // Check notification preferences for each user
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('user_id, task_comment_added, task_mentioned')
    .in('user_id', Array.from(notifyUserIds))

  const prefsMap = new Map<string, any>(
    (preferences || []).map((p: any) => [p.user_id, p])
  )

  // Create in-app notifications for each user
  const commenterName = commenter.full_name || commenter.email || 'Someone'

  for (const userId of notifyUserIds) {
    const prefs = prefsMap.get(userId)
    const isMentioned = mentions.includes(userId)

    // Check preferences (default to true if no preferences set)
    if (isMentioned) {
      if (prefs && prefs.task_mentioned === false) continue
    } else {
      if (prefs && prefs.task_comment_added === false) continue
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: isMentioned
          ? `${commenterName} mentioned you`
          : `New comment on "${task.title}"`,
        message: comment.content.substring(0, 200),
        type: 'info',
        entity_type: 'task',
        entity_id: task.id,
      })
  }
}

async function handleDeleteComment(params: Record<string, string | undefined>, user: any, profile: any, supabase: any) {
  const commentId = params.id
  if (!commentId) {
    throw { statusCode: 400, message: 'Comment ID is required' }
  }

  // Get comment
  const { data: comment, error: fetchError } = await supabase
    .from('task_comments')
    .select('id, user_id')
    .eq('id', commentId)
    .single()

  if (fetchError || !comment) {
    throw { statusCode: 404, message: 'Comment not found' }
  }

  // Check permissions: own comment or admin/manager
  if (comment.user_id !== user.id && !['admin', 'manager'].includes(profile.role)) {
    throw { statusCode: 403, message: 'Permission denied' }
  }

  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    throw { statusCode: 500, message: 'Failed to delete comment', details: error.message }
  }

  return successResponse({ message: 'Comment deleted' })
}
