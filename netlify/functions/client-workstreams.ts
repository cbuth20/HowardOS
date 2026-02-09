import { Handler } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse, errorResponse } from './lib/responses'
import {
  AssignWorkstreamSchema,
  UpdateClientWorkstreamSchema,
} from '../../src/types/schemas'

/**
 * GET /api/client-workstreams - List assignments (filtered by role/org)
 * GET /api/client-workstreams?id={id} - Get single assignment
 * POST /api/client-workstreams - Assign workstream to client (admin only)
 * PATCH /api/client-workstreams?id={id} - Update status/notes (admin only)
 * DELETE /api/client-workstreams?id={id} - Remove assignment (admin only)
 *
 * Auth required, role-based filtering
 */
export const handler: Handler = withMiddleware(async (event, context: AuthContext) => {
  const supabase = context.supabase
  const supabaseAdmin = context.supabaseAdmin // Use for queries that need to bypass RLS
  const userId = context.user?.id
  const userRole = context.profile?.role
  const userOrgId = context.profile?.org_id

  // Debug logging
  console.log('Workstreams request - User:', userId, 'Role:', userRole, 'OrgID:', userOrgId)

  if (!userId) {
    return errorResponse('Unauthorized', 401)
  }

  const params = event.queryStringParameters || {}
  const workstreamId = params.id

  try {
    // GET - List assignments or get single assignment
    if (event.httpMethod === 'GET') {
      // Get single assignment by ID
      if (workstreamId) {
        let query = (supabaseAdmin as any)
          .from('client_workstreams')
          .select(`
            *,
            template:workstream_templates(
              *,
              vertical:workstream_verticals(*)
            ),
            point_person:profiles!client_workstreams_point_person_id_fkey(
              id, full_name, email, avatar_url
            ),
            organization:organizations(id, name, slug)
          `)
          .eq('id', workstreamId)

        // CRITICAL: Clients can only see their own org's workstreams
        if (userRole === 'client' && userOrgId) {
          console.log('Applying client org filter for single workstream:', userOrgId)
          query = query.eq('org_id', userOrgId)
        }

        const { data: workstream, error } = await query.single()

        if (error) {
          console.error('Error fetching workstream:', error)
          return errorResponse('Workstream not found', 404)
        }

        return successResponse({ workstream })
      }

      // List all assignments with filters
      // Use supabaseAdmin to bypass RLS for template JOINs
      let query = (supabaseAdmin as any)
        .from('client_workstreams')
        .select(`
          *,
          template:workstream_templates(
            *,
            vertical:workstream_verticals(*)
          ),
          point_person:profiles!client_workstreams_point_person_id_fkey(
            id, full_name, email, avatar_url
          ),
          organization:organizations(id, name, slug)
        `)

      // CRITICAL: Clients can only see their own org's workstreams
      // Apply this filter FIRST before any other filters
      if (userRole === 'client' && userOrgId) {
        console.log('Applying client org filter:', userOrgId)
        query = query.eq('org_id', userOrgId)
      } else if (params.org_id) {
        // Admins can filter by org_id if provided
        query = query.eq('org_id', params.org_id)
      }

      // Apply other filters
      if (params.status) {
        query = query.eq('status', params.status)
      }
      if (params.point_person_id) {
        query = query.eq('point_person_id', params.point_person_id)
      }
      if (params.is_active !== undefined) {
        query = query.eq('is_active', params.is_active === 'true')
      }

      // Apply ordering
      query = query.order('created_at', { ascending: false })

      const { data: workstreams, error } = await query

      console.log('Fetched workstreams:', workstreams?.length, 'items')

      if (error) {
        console.error('Error fetching workstreams:', error)
        return errorResponse('Failed to fetch workstreams')
      }

      return successResponse({ workstreams })
    }

    // POST - Assign workstream to client (admin only)
    if (event.httpMethod === 'POST') {
      if (userRole !== 'admin') {
        return errorResponse('Admin access required', 403)
      }

      const body = JSON.parse(event.body || '{}')

      // Validate input
      const validation = AssignWorkstreamSchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(validation.error.errors[0].message, 400)
      }

      const data = validation.data

      // Check if assignment already exists
      const { data: existing } = await (supabaseAdmin as any)
        .from('client_workstreams')
        .select('id')
        .eq('template_id', data.template_id)
        .eq('org_id', data.org_id)
        .single()

      if (existing) {
        return errorResponse('This workstream is already assigned to the client', 400)
      }

      // Insert assignment
      const { data: workstream, error } = await (supabaseAdmin as any)
        .from('client_workstreams')
        .insert({
          ...data,
          assigned_by: userId,
        })
        .select(`
          *,
          template:workstream_templates(
            *,
            vertical:workstream_verticals(*)
          ),
          point_person:profiles!client_workstreams_point_person_id_fkey(
            id, full_name, email, avatar_url
          ),
          organization:organizations(id, name, slug)
        `)
        .single()

      if (error) {
        console.error('Error assigning workstream:', error)
        return errorResponse('Failed to assign workstream')
      }

      // Log activity
      await (supabaseAdmin as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_assigned',
        entity_type: 'client_workstream',
        entity_id: workstream.id,
        metadata: {
          template_id: data.template_id,
          org_id: data.org_id,
          status: data.status,
        } as any,
      })

      return { statusCode: 201, body: JSON.stringify(successResponse({ workstream })) }
    }

    // PATCH - Update status/notes (admin only)
    if (event.httpMethod === 'PATCH') {
      if (userRole !== 'admin') {
        return errorResponse('Admin access required', 403)
      }

      if (!workstreamId) {
        return errorResponse('Workstream ID is required', 400)
      }

      const body = JSON.parse(event.body || '{}')

      // Validate input
      const validation = UpdateClientWorkstreamSchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(validation.error.errors[0].message, 400)
      }

      const data = validation.data

      // Update workstream
      const { data: workstream, error } = await (supabaseAdmin as any)
        .from('client_workstreams')
        .update(data)
        .eq('id', workstreamId)
        .select(`
          *,
          template:workstream_templates(
            *,
            vertical:workstream_verticals(*)
          ),
          point_person:profiles!client_workstreams_point_person_id_fkey(
            id, full_name, email, avatar_url
          ),
          organization:organizations(id, name, slug)
        `)
        .single()

      if (error) {
        console.error('Error updating workstream:', error)
        return errorResponse('Failed to update workstream')
      }

      // Log activity
      await (supabaseAdmin as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_updated',
        entity_type: 'client_workstream',
        entity_id: workstream.id,
        metadata: {
          changes: data,
        } as any,
      })

      return successResponse({ workstream })
    }

    // DELETE - Remove assignment (admin only)
    if (event.httpMethod === 'DELETE') {
      if (userRole !== 'admin') {
        return errorResponse('Admin access required', 403)
      }

      if (!workstreamId) {
        return errorResponse('Workstream ID is required', 400)
      }

      // Soft delete by setting is_active = false
      const { data: workstream, error } = await (supabaseAdmin as any)
        .from('client_workstreams')
        .update({ is_active: false })
        .eq('id', workstreamId)
        .select('id, org_id')
        .single()

      if (error) {
        console.error('Error removing workstream:', error)
        return errorResponse('Failed to remove workstream')
      }

      // Log activity
      await (supabaseAdmin as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_removed',
        entity_type: 'client_workstream',
        entity_id: workstream.id,
        metadata: { org_id: workstream.org_id } as any,
      })

      return successResponse({ message: 'Workstream removed successfully' })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse('Internal server error')
  }
}, { requireAuth: true })
