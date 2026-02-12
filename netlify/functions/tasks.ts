import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext, isTeamRole, isAdminOrManagerRole } from './lib/middleware'
import { successResponse } from './lib/responses'
import { CreateTaskSchema, UpdateTaskSchema } from '../../src/types/schemas'
import { sendTaskNotificationEmail } from '../../src/lib/email/postmark'

const TASK_SELECT_QUERY = `
  *,
  assigned_to_profile:profiles!tasks_assigned_to_fkey(
    id,
    full_name,
    email,
    avatar_url,
    role
  ),
  created_by_profile:profiles!tasks_created_by_fkey(
    id,
    full_name,
    email,
    avatar_url
  )
`

export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, userOrgs, supabase }: AuthContext) => {
  const method = event.httpMethod

  if (method === 'GET') {
    return handleGetTasks(event, profile, userOrgs, supabase)
  }
  if (method === 'POST') {
    return handleCreateTask(event, user, profile, userOrgs, supabase)
  }
  if (method === 'PATCH') {
    return handleUpdateTask(event, user, profile, userOrgs, supabase)
  }
  if (method === 'DELETE') {
    return handleDeleteTask(event, profile, supabase)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true })

async function handleGetTasks(event: HandlerEvent, profile: any, userOrgs: string[], supabase: any) {
  const params = event.queryStringParameters || {}
  const view = params.view || 'my-tasks'
  const assigneeFilter = params.assignee || null
  const statusFilter = params.status || null
  const orgIdFilter = params.org_id || null
  const longOutstanding = params.long_outstanding === 'true'

  let query = supabase
    .from('tasks')
    .select(TASK_SELECT_QUERY)

  if (profile.role === 'client') {
    // Clients only see tasks assigned to them, exclude internal tasks
    query = query.eq('assigned_to', profile.id).eq('is_internal', false)
  } else if (isTeamRole(profile.role)) {
    // Team members: admin/manager see all, user role filtered by allowed_org_ids
    if (profile.role === 'user' && profile.allowed_org_ids?.length > 0) {
      query = query.in('org_id', profile.allowed_org_ids)
    }

    // View-based filtering
    if (view === 'my-tasks') {
      query = query.eq('assigned_to', profile.id)
    } else if (view === 'team-tasks') {
      // Tasks assigned to team members
      const { data: teamProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'manager', 'user'])

      const teamIds = teamProfiles?.map((p: any) => p.id) || []
      if (teamIds.length > 0) {
        query = query.in('assigned_to', teamIds)
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    } else if (view === 'client-tasks') {
      // Tasks assigned to client users
      const { data: clientProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['client'])

      const clientIds = clientProfiles?.map((p: any) => p.id) || []
      if (clientIds.length > 0) {
        query = query.in('assigned_to', clientIds)
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    }
    // 'all-tasks': No filter, show all tasks user can access

    // Apply assignee filter if provided
    if (assigneeFilter) {
      query = query.eq('assigned_to', assigneeFilter)
    }
  }

  // Apply status filter if provided
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  // Apply org filter if provided
  if (orgIdFilter) {
    query = query.eq('org_id', orgIdFilter)
  }

  // Apply long outstanding filter (tasks > 30 days old that aren't completed)
  if (longOutstanding) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    query = query.lt('created_at', thirtyDaysAgo.toISOString()).neq('status', 'completed').neq('status', 'cancelled')
  }

  // Order by created_at desc
  query = query.order('created_at', { ascending: false })

  const { data: tasks, error: tasksError } = await query

  if (tasksError) {
    throw { statusCode: 500, message: 'Failed to fetch tasks', details: tasksError.message }
  }

  return successResponse({ tasks })
}

async function handleCreateTask(event: HandlerEvent, user: any, profile: any, userOrgs: string[], supabase: any) {
  const body = JSON.parse(event.body || '{}')

  // Validate with Zod
  const validation = CreateTaskSchema.safeParse(body)
  if (!validation.success) {
    throw {
      statusCode: 400,
      message: 'Validation failed',
      details: validation.error.format(),
    }
  }

  const { title, description, status, priority, assigned_to, due_date, target_org_id, is_internal, is_recurring, recurrence_rule } = validation.data

  // Determine task org_id
  let taskOrgId = profile.org_id
  if (isTeamRole(profile.role) && target_org_id) {
    taskOrgId = target_org_id
  }

  // Check assignment permissions for clients
  if (profile.role === 'client' && assigned_to && assigned_to !== user.id) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', assigned_to)
      .single()

    if (!assigneeProfile || !isTeamRole(assigneeProfile.role)) {
      throw { statusCode: 403, message: 'Cannot assign to other clients' }
    }
  }

  // Create task
  const { data: newTask, error: createError } = await supabase
    .from('tasks')
    .insert({
      org_id: taskOrgId,
      title: title.trim(),
      description: description?.trim() || null,
      status,
      priority,
      assigned_to: assigned_to || null,
      created_by: user.id,
      due_date: due_date || null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      is_internal: is_internal || false,
      is_recurring: is_recurring || false,
      recurrence_rule: recurrence_rule || null,
      next_occurrence_at: is_recurring && recurrence_rule ? calculateNextOccurrence(recurrence_rule).toISOString() : null,
    })
    .select(TASK_SELECT_QUERY)
    .single()

  if (createError) {
    throw { statusCode: 500, message: 'Failed to create task', details: createError.message }
  }

  // Log activity
  await supabase
    .from('activity_log')
    .insert({
      org_id: taskOrgId,
      user_id: user.id,
      action: 'task_created',
      entity_type: 'task',
      entity_id: newTask.id,
      metadata: {
        task_title: title,
        status,
        priority,
        assigned_to,
        is_internal: is_internal || false,
        is_external: profile.org_id !== taskOrgId,
      },
    })

  // Send notification + email to assignee if assigned
  if (assigned_to && assigned_to !== user.id) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('org_id, email, full_name')
      .eq('id', assigned_to)
      .single()

    await supabase
      .from('notifications')
      .insert({
        org_id: assigneeProfile?.org_id || taskOrgId,
        user_id: assigned_to,
        type: 'task_assigned',
        title: 'New task assigned',
        message: `${profile.full_name || profile.email} assigned you a task: ${title}`,
        action_url: `/tasks`,
        related_resource_type: 'task',
        related_resource_id: newTask.id,
      })

    // Send email (non-blocking, respect preferences)
    try {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('task_assigned')
        .eq('user_id', assigned_to)
        .single()

      if (!prefs || prefs.task_assigned !== false) {
        await sendTaskNotificationEmail({
          to: assigneeProfile.email,
          recipientName: assigneeProfile.full_name || assigneeProfile.email,
          actorName: profile.full_name || profile.email,
          taskTitle: title,
          taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
          message: 'assigned you a task:',
          type: 'assigned',
        })
      }
    } catch (emailErr) {
      console.error('Error sending task assignment email:', emailErr)
    }
  }

  return { statusCode: 201, data: { task: newTask } }
}

async function handleUpdateTask(event: HandlerEvent, user: any, profile: any, userOrgs: string[], supabase: any) {
  const params = event.queryStringParameters || {}
  const taskId = params.id

  if (!taskId) {
    throw { statusCode: 400, message: 'Task ID is required' }
  }

  // Get existing task
  const { data: existingTask, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (fetchError || !existingTask) {
    throw { statusCode: 404, message: 'Task not found' }
  }

  // Check permissions: team can update tasks they have access to, clients only their own
  if (profile.role === 'client') {
    if (existingTask.assigned_to !== user.id && existingTask.created_by !== user.id) {
      throw { statusCode: 403, message: 'Permission denied' }
    }
  } else if (profile.role === 'user') {
    // User role: check allowed_org_ids
    if (profile.allowed_org_ids?.length > 0 && !profile.allowed_org_ids.includes(existingTask.org_id)) {
      throw { statusCode: 403, message: 'Permission denied' }
    }
  }
  // admin/manager can update any task

  const body = JSON.parse(event.body || '{}')

  // Validate with Zod
  const validation = UpdateTaskSchema.safeParse(body)
  if (!validation.success) {
    throw {
      statusCode: 400,
      message: 'Validation failed',
      details: validation.error.format(),
    }
  }

  const data = validation.data
  const updates: any = {}

  // Apply updates
  if (data.title !== undefined) {
    updates.title = data.title.trim()
  }

  if (data.description !== undefined) {
    updates.description = data.description?.trim() || null
  }

  if (data.status !== undefined) {
    updates.status = data.status

    // Set completed_at when marking complete
    if (data.status === 'completed' && existingTask.status !== 'completed') {
      updates.completed_at = new Date().toISOString()
    } else if (data.status !== 'completed') {
      updates.completed_at = null
    }
  }

  if (data.priority !== undefined) {
    updates.priority = data.priority
  }

  if (data.is_internal !== undefined) {
    updates.is_internal = data.is_internal
  }

  if (data.is_recurring !== undefined) {
    updates.is_recurring = data.is_recurring
    if (!data.is_recurring) {
      updates.recurrence_rule = null
      updates.next_occurrence_at = null
    }
  }

  if (data.recurrence_rule !== undefined) {
    updates.recurrence_rule = data.recurrence_rule
    if (data.recurrence_rule) {
      updates.next_occurrence_at = calculateNextOccurrence(data.recurrence_rule).toISOString()
    }
  }

  if (data.assigned_to !== undefined) {
    // Check assignment permissions for clients
    if (profile.role === 'client' && data.assigned_to && data.assigned_to !== user.id) {
      const { data: assigneeProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.assigned_to)
        .single()

      if (!assigneeProfile || !isTeamRole(assigneeProfile.role)) {
        throw { statusCode: 403, message: 'Cannot assign to other clients' }
      }
    }
    updates.assigned_to = data.assigned_to || null
  }

  if (data.due_date !== undefined) {
    updates.due_date = data.due_date || null
  }

  // Update task
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select(TASK_SELECT_QUERY)
    .single()

  if (updateError) {
    throw { statusCode: 500, message: 'Failed to update task', details: updateError.message }
  }

  // Log activity
  await supabase
    .from('activity_log')
    .insert({
      org_id: existingTask.org_id,
      user_id: user.id,
      action: 'task_updated',
      entity_type: 'task',
      entity_id: taskId,
      metadata: {
        task_title: updatedTask.title,
        changes: updates,
      },
    })

  // Send notification if assignee changed
  if (updates.assigned_to !== undefined && updates.assigned_to !== existingTask.assigned_to && updates.assigned_to !== user.id) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('org_id, email, full_name')
      .eq('id', updates.assigned_to)
      .single()

    await supabase
      .from('notifications')
      .insert({
        org_id: assigneeProfile?.org_id || existingTask.org_id,
        user_id: updates.assigned_to,
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: `${profile.full_name || profile.email} assigned you a task: ${updatedTask.title}`,
        action_url: `/tasks`,
        related_resource_type: 'task',
        related_resource_id: taskId,
      })

    // Send email (non-blocking)
    try {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('task_assigned')
        .eq('user_id', updates.assigned_to)
        .single()

      if (!prefs || prefs.task_assigned !== false) {
        await sendTaskNotificationEmail({
          to: assigneeProfile.email,
          recipientName: assigneeProfile.full_name || assigneeProfile.email,
          actorName: profile.full_name || profile.email,
          taskTitle: updatedTask.title,
          taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
          message: 'assigned you a task:',
          type: 'assigned',
        })
      }
    } catch (emailErr) {
      console.error('Error sending task reassignment email:', emailErr)
    }
  }

  // Send email on status change to assignee/creator
  if (updates.status && updates.status !== existingTask.status) {
    const notifyIds = new Set<string>()
    if (existingTask.assigned_to && existingTask.assigned_to !== user.id) notifyIds.add(existingTask.assigned_to)
    if (existingTask.created_by && existingTask.created_by !== user.id) notifyIds.add(existingTask.created_by)

    for (const notifyId of notifyIds) {
      try {
        const { data: notifyProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', notifyId)
          .single()

        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('task_status_changed')
          .eq('user_id', notifyId)
          .single()

        if (notifyProfile && (!prefs || prefs.task_status_changed !== false)) {
          await sendTaskNotificationEmail({
            to: notifyProfile.email,
            recipientName: notifyProfile.full_name || notifyProfile.email,
            actorName: profile.full_name || profile.email,
            taskTitle: updatedTask.title,
            taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
            message: `changed the status to "${updates.status}" on:`,
            type: 'status_changed',
          })
        }
      } catch (emailErr) {
        console.error('Error sending status change email:', emailErr)
      }
    }
  }

  return successResponse({ task: updatedTask })
}

async function handleDeleteTask(event: HandlerEvent, profile: any, supabase: any) {
  const params = event.queryStringParameters || {}
  const taskId = params.id

  if (!taskId) {
    throw { statusCode: 400, message: 'Task ID is required' }
  }

  // Get existing task
  const { data: existingTask, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (fetchError || !existingTask) {
    throw { statusCode: 404, message: 'Task not found' }
  }

  // Check permissions: admin/manager can delete any, clients only their own
  if (!isAdminOrManagerRole(profile.role)) {
    if (profile.role === 'client' && existingTask.created_by === profile.id) {
      // Clients can delete tasks they created
    } else {
      throw { statusCode: 403, message: 'Permission denied' }
    }
  }

  // Delete task
  const { error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (deleteError) {
    throw { statusCode: 500, message: 'Failed to delete task', details: deleteError.message }
  }

  // Log activity
  await supabase
    .from('activity_log')
    .insert({
      org_id: existingTask.org_id,
      user_id: profile.id,
      action: 'task_deleted',
      entity_type: 'task',
      entity_id: taskId,
      metadata: {
        task_title: existingTask.title,
      },
    })

  return successResponse({ message: 'Task deleted successfully' })
}

/**
 * Calculate the next occurrence date for a recurring task.
 */
function calculateNextOccurrence(rule: any, from?: Date): Date {
  const next = from ? new Date(from) : new Date()
  const interval = rule.interval || 1

  switch (rule.frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval)
      if (rule.day_of_week !== undefined) {
        const currentDay = next.getDay()
        const diff = rule.day_of_week - currentDay
        if (diff !== 0) {
          next.setDate(next.getDate() + diff)
        }
      }
      break

    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      if (rule.day_of_month) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(rule.day_of_month, maxDay))
      }
      break

    case 'quarterly':
      next.setMonth(next.getMonth() + 3 * interval)
      if (rule.day_of_month) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(rule.day_of_month, maxDay))
      }
      break
  }

  next.setHours(9, 0, 0, 0)
  return next
}
