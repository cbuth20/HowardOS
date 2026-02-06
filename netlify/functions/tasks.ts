import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'
import { CreateTaskSchema, UpdateTaskSchema } from '../../src/types/schemas'

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

export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, supabase }: AuthContext) => {
  const method = event.httpMethod

  if (method === 'GET') {
    return handleGetTasks(event, profile, supabase)
  }
  if (method === 'POST') {
    return handleCreateTask(event, user, profile, supabase)
  }
  if (method === 'PATCH') {
    return handleUpdateTask(event, user, profile, supabase)
  }
  if (method === 'DELETE') {
    return handleDeleteTask(event, profile, supabase)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true })

async function handleGetTasks(event: HandlerEvent, profile: any, supabase: any) {
  const params = event.queryStringParameters || {}
  const view = params.view || 'my-tasks'
  const assigneeFilter = params.assignee || null
  const statusFilter = params.status || null

  let query = supabase
    .from('tasks')
    .select(TASK_SELECT_QUERY)

  // Apply filters based on role
  if (profile.role === 'client') {
    // Clients only see tasks assigned to them (RLS will enforce this too)
    query = query.eq('assigned_to', profile.id)
  } else if (profile.role === 'admin') {
    // Admin view filters
    if (view === 'my-tasks') {
      query = query.eq('assigned_to', profile.id)
    } else if (view === 'team-tasks') {
      query = query
        .eq('org_id', profile.org_id)
        .not('assigned_to', 'is', null)
    } else if (view === 'client-tasks') {
      // Get all client user IDs
      const { data: clientProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'client')

      const clientIds = clientProfiles?.map((p: any) => p.id) || []
      if (clientIds.length > 0) {
        query = query.in('assigned_to', clientIds)
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    }
    // 'all-tasks': No filter, show all tasks admin can access

    // Apply assignee filter if provided
    if (assigneeFilter) {
      query = query.eq('assigned_to', assigneeFilter)
    }
  }

  // Apply status filter if provided
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  // Order by created_at desc
  query = query.order('created_at', { ascending: false })

  const { data: tasks, error: tasksError } = await query

  if (tasksError) {
    throw { statusCode: 500, message: 'Failed to fetch tasks', details: tasksError.message }
  }

  return successResponse({ tasks })
}

async function handleCreateTask(event: HandlerEvent, user: any, profile: any, supabase: any) {
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

  const { title, description, status, priority, assigned_to, due_date, target_org_id } = validation.data

  // Determine task org_id
  let taskOrgId = profile.org_id
  if (profile.role === 'admin' && target_org_id) {
    taskOrgId = target_org_id
  }

  // Check assignment permissions for clients
  if (profile.role === 'client' && assigned_to && assigned_to !== user.id) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', assigned_to)
      .single()

    if (!assigneeProfile || assigneeProfile.role !== 'admin') {
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
    })
    .select(TASK_SELECT_QUERY)
    .single()

  if (createError) {
    throw { statusCode: 500, message: 'Failed to create task', details: createError.message }
  }

  // Log activity (will use activity_logs table after migration)
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
        is_external: profile.org_id !== taskOrgId,
      },
    })

  // Send notification to assignee if assigned
  if (assigned_to && assigned_to !== user.id) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('org_id')
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
  }

  return { statusCode: 201, data: { task: newTask } }
}

async function handleUpdateTask(event: HandlerEvent, user: any, profile: any, supabase: any) {
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

  // Check permissions
  if (existingTask.org_id !== profile.org_id) {
    throw { statusCode: 403, message: 'Permission denied' }
  }

  if (profile.role === 'client') {
    if (existingTask.assigned_to !== user.id && existingTask.created_by !== user.id) {
      throw { statusCode: 403, message: 'Permission denied' }
    }
  }

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

  if (data.assigned_to !== undefined) {
    // Check assignment permissions for clients
    if (profile.role === 'client' && data.assigned_to && data.assigned_to !== user.id) {
      const { data: assigneeProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.assigned_to)
        .single()

      if (!assigneeProfile || assigneeProfile.role !== 'admin') {
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
      .select('org_id')
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

  // Check permissions
  if (profile.role === 'client') {
    throw { statusCode: 403, message: 'Only admins can delete tasks' }
  }

  if (existingTask.org_id !== profile.org_id) {
    throw { statusCode: 403, message: 'Permission denied' }
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
