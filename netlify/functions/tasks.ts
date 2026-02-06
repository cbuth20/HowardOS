import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json',
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  try {
    // Get auth token from header
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    })

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, org_id, role, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Profile not found' }),
      }
    }

    // Handle GET - List tasks
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const view = params.view || 'my-tasks'
      const assigneeFilter = params.assignee || null
      const statusFilter = params.status || null

      let query = supabase
        .from('tasks')
        .select(`
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
        `)

      // Apply org filter only for clients
      // Admins can see tasks across all orgs (controlled by RLS)
      if (profile.role === 'client') {
        // Clients only see tasks assigned to them (RLS will enforce this too)
        query = query.eq('assigned_to', user.id)
      } else if (profile.role === 'admin') {
        // Admin view filters
        if (view === 'my-tasks') {
          // Tasks assigned to this admin
          query = query.eq('assigned_to', user.id)
        } else if (view === 'team-tasks') {
          // Tasks created by this admin or in their org, assigned to someone
          query = query
            .eq('org_id', profile.org_id)
            .not('assigned_to', 'is', null)
        } else if (view === 'client-tasks') {
          // Tasks assigned to clients (any org)
          // Get all client user IDs across all orgs
          const { data: clientProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'client')

          const clientIds = clientProfiles?.map(p => p.id) || []
          if (clientIds.length > 0) {
            query = query.in('assigned_to', clientIds)
          } else {
            // No clients, return empty
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
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch tasks', details: tasksError.message }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ tasks }),
      }
    }

    // Handle POST - Create task
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { title, description, status, priority, assigned_to, due_date, target_org_id } = body

      // Validation
      if (!title || title.trim().length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Title is required' }),
        }
      }

      if (!status || !['pending', 'in_progress', 'completed', 'hidden', 'cancelled'].includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid status' }),
        }
      }

      if (!priority || !['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid priority' }),
        }
      }

      // Determine task org_id
      // Admins can create tasks in any org (for external assignment)
      // Clients can only create tasks in their own org
      let taskOrgId = profile.org_id
      if (profile.role === 'admin' && target_org_id) {
        taskOrgId = target_org_id
      }

      // Check assignment permissions for clients
      if (profile.role === 'client' && assigned_to && assigned_to !== user.id) {
        // Clients can only assign to themselves or admins
        const { data: assigneeProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', assigned_to)
          .single()

        if (!assigneeProfile || assigneeProfile.role !== 'admin') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Cannot assign to other clients' }),
          }
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
        .select(`
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
        `)
        .single()

      if (createError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to create task', details: createError.message }),
        }
      }

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          org_id: taskOrgId,
          user_id: user.id,
          action: 'task_created',
          resource_type: 'task',
          resource_id: newTask.id,
          details: {
            task_title: title,
            status,
            priority,
            assigned_to,
            is_external: profile.org_id !== taskOrgId,
          },
        })

      // Send notification to assignee if assigned
      if (assigned_to && assigned_to !== user.id) {
        // Get assignee's org_id for notification
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

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ task: newTask }),
      }
    }

    // Handle PATCH - Update task
    if (event.httpMethod === 'PATCH') {
      const params = event.queryStringParameters || {}
      const taskId = params.id

      if (!taskId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Task ID is required' }),
        }
      }

      // Get existing task
      const { data: existingTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (fetchError || !existingTask) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Task not found' }),
        }
      }

      // Check permissions
      if (existingTask.org_id !== profile.org_id) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Permission denied' }),
        }
      }

      if (profile.role === 'client') {
        // Clients can only edit tasks assigned to them or created by them
        if (existingTask.assigned_to !== user.id && existingTask.created_by !== user.id) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Permission denied' }),
          }
        }
      }

      const body = JSON.parse(event.body || '{}')
      const updates: any = {}

      // Validate and apply updates
      if (body.title !== undefined) {
        if (body.title.trim().length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Title cannot be empty' }),
          }
        }
        updates.title = body.title.trim()
      }

      if (body.description !== undefined) {
        updates.description = body.description?.trim() || null
      }

      if (body.status !== undefined) {
        if (!['pending', 'in_progress', 'completed', 'hidden', 'cancelled'].includes(body.status)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid status' }),
          }
        }
        updates.status = body.status

        // Set completed_at when marking complete
        if (body.status === 'completed' && existingTask.status !== 'completed') {
          updates.completed_at = new Date().toISOString()
        } else if (body.status !== 'completed') {
          updates.completed_at = null
        }
      }

      if (body.priority !== undefined) {
        if (!['low', 'medium', 'high', 'urgent'].includes(body.priority)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid priority' }),
          }
        }
        updates.priority = body.priority
      }

      if (body.assigned_to !== undefined) {
        // Check assignment permissions for clients
        if (profile.role === 'client' && body.assigned_to && body.assigned_to !== user.id) {
          const { data: assigneeProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', body.assigned_to)
            .single()

          if (!assigneeProfile || assigneeProfile.role !== 'admin') {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({ error: 'Cannot assign to other clients' }),
            }
          }
        }
        updates.assigned_to = body.assigned_to || null
      }

      if (body.due_date !== undefined) {
        updates.due_date = body.due_date || null
      }

      // Update task
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select(`
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
        `)
        .single()

      if (updateError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to update task', details: updateError.message }),
        }
      }

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          org_id: profile.org_id,
          user_id: user.id,
          action: 'task_updated',
          resource_type: 'task',
          resource_id: taskId,
          details: {
            updates,
            previous: existingTask,
          },
        })

      // Send notification if assignee changed
      if (updates.assigned_to && updates.assigned_to !== existingTask.assigned_to && updates.assigned_to !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            org_id: profile.org_id,
            user_id: updates.assigned_to,
            type: 'task_assigned',
            title: 'Task assigned to you',
            message: `${profile.full_name || profile.email} assigned you a task: ${updatedTask.title}`,
            action_url: `/tasks`,
            related_resource_type: 'task',
            related_resource_id: taskId,
          })
      }

      // Send notification if task completed
      if (updates.status === 'completed' && existingTask.status !== 'completed') {
        if (existingTask.created_by !== user.id) {
          await supabase
            .from('notifications')
            .insert({
              org_id: profile.org_id,
              user_id: existingTask.created_by,
              type: 'task_completed',
              title: 'Task completed',
              message: `${profile.full_name || profile.email} completed: ${updatedTask.title}`,
              action_url: `/tasks`,
              related_resource_type: 'task',
              related_resource_id: taskId,
            })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ task: updatedTask }),
      }
    }

    // Handle DELETE - Delete task
    if (event.httpMethod === 'DELETE') {
      const params = event.queryStringParameters || {}
      const taskId = params.id

      if (!taskId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Task ID is required' }),
        }
      }

      // Get existing task
      const { data: existingTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (fetchError || !existingTask) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Task not found' }),
        }
      }

      // Check permissions
      if (existingTask.org_id !== profile.org_id) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Permission denied' }),
        }
      }

      if (profile.role === 'client') {
        // Clients can only delete tasks they created
        if (existingTask.created_by !== user.id) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Permission denied' }),
          }
        }
      }

      // Delete task
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to delete task', details: deleteError.message }),
        }
      }

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          org_id: profile.org_id,
          user_id: user.id,
          action: 'task_deleted',
          resource_type: 'task',
          resource_id: taskId,
          details: {
            task: existingTask,
          },
        })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Task deleted successfully' }),
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    console.error('Task API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
