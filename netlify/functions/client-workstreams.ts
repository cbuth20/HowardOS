import { Handler } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse, errorResponse } from './lib/responses'
import {
  CreateWorkstreamSchema,
  UpdateWorkstreamSchema,
} from '../../src/types/schemas'

/**
 * GET /api/client-workstreams - List workstreams (filtered by role/org)
 * GET /api/client-workstreams?id={id} - Get single workstream with entries
 * GET /api/client-workstreams?org_id={id} - Get workstream for specific org
 * POST /api/client-workstreams - Create workstream for org (admin only)
 * PATCH /api/client-workstreams?id={id} - Update workstream metadata (admin only)
 * DELETE /api/client-workstreams?id={id} - Delete workstream (admin only)
 *
 * Auth required, role-based filtering
 */
export const handler: Handler = withMiddleware(async (event, context: AuthContext) => {
  const supabase = context.supabase
  const supabaseAdmin = context.supabaseAdmin
  const userId = context.user?.id
  const userRole = context.profile?.role
  const userOrgId = context.profile?.org_id

  console.log('Client workstreams request - User:', userId, 'Role:', userRole, 'OrgID:', userOrgId)

  if (!userId) {
    return errorResponse('Unauthorized', 401)
  }

  const params = event.queryStringParameters || {}
  const workstreamId = params.id
  const orgId = params.org_id

  try {
    // GET - List workstreams or get single workstream
    if (event.httpMethod === 'GET') {
      // Get single workstream by ID (with entries and rollups)
      if (workstreamId) {
        let query = (supabaseAdmin as any)
          .from('client_workstreams')
          .select(`
            *,
            organization:organizations(id, name, slug)
          `)
          .eq('id', workstreamId)

        // Clients can only see their own org's workstream
        if (userRole === 'client' && userOrgId) {
          query = query.eq('org_id', userOrgId)
        }

        const { data: workstream, error } = await query.single()

        if (error) {
          console.error('Error fetching workstream:', error)
          return errorResponse('Workstream not found', 404)
        }

        // Fetch all entries for this workstream
        const { data: entries } = await (supabaseAdmin as any)
          .from('workstream_entries')
          .select(`
            *,
            vertical:workstream_verticals(*),
            point_person:profiles!workstream_entries_point_person_id_fkey(
              id, full_name, email, avatar_url
            ),
            template:workstream_templates(id, name)
          `)
          .eq('workstream_id', workstreamId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        // Fetch vertical rollups
        const { data: verticalRollups } = await (supabaseAdmin as any)
          .from('workstream_vertical_status')
          .select('*')
          .eq('workstream_id', workstreamId)

        // Calculate overall status
        let overallStatus: 'green' | 'yellow' | 'red' = 'green'
        if (verticalRollups && verticalRollups.length > 0) {
          const hasRed = verticalRollups.some((v: any) => v.rollup_status === 'red')
          const hasYellow = verticalRollups.some((v: any) => v.rollup_status === 'yellow')

          if (hasRed) overallStatus = 'red'
          else if (hasYellow) overallStatus = 'yellow'
        }

        return successResponse({
          workstream: {
            ...workstream,
            entries: entries || [],
            vertical_rollups: verticalRollups || [],
            overall_status: overallStatus,
          },
        })
      }

      // Get workstream by org_id
      if (orgId) {
        // Clients can only access their own org
        if (userRole === 'client' && userOrgId && orgId !== userOrgId) {
          return errorResponse('Access denied', 403)
        }

        const { data: workstream, error } = await (supabaseAdmin as any)
          .from('client_workstreams')
          .select(`
            *,
            organization:organizations(id, name, slug)
          `)
          .eq('org_id', orgId)
          .single()

        if (error) {
          // Workstream doesn't exist for this org yet
          if (error.code === 'PGRST116') {
            return successResponse({ workstream: null })
          }
          console.error('Error fetching workstream:', error)
          return errorResponse('Failed to fetch workstream')
        }

        // Fetch all entries for this workstream
        const { data: entries } = await (supabaseAdmin as any)
          .from('workstream_entries')
          .select(`
            *,
            vertical:workstream_verticals(*),
            point_person:profiles!workstream_entries_point_person_id_fkey(
              id, full_name, email, avatar_url
            ),
            template:workstream_templates(id, name)
          `)
          .eq('workstream_id', workstream.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        // Fetch vertical rollups
        const { data: verticalRollups } = await (supabaseAdmin as any)
          .from('workstream_vertical_status')
          .select('*')
          .eq('workstream_id', workstream.id)

        // Calculate overall status
        let overallStatus: 'green' | 'yellow' | 'red' = 'green'
        if (verticalRollups && verticalRollups.length > 0) {
          const hasRed = verticalRollups.some((v: any) => v.rollup_status === 'red')
          const hasYellow = verticalRollups.some((v: any) => v.rollup_status === 'yellow')

          if (hasRed) overallStatus = 'red'
          else if (hasYellow) overallStatus = 'yellow'
        }

        return successResponse({
          workstream: {
            ...workstream,
            entries: entries || [],
            vertical_rollups: verticalRollups || [],
            overall_status: overallStatus,
          },
        })
      }

      // List all workstreams (team members only - for overview page)
      if (!['admin', 'manager', 'user'].includes(userRole)) {
        return errorResponse('Team member access required', 403)
      }

      const { data: workstreams, error } = await (supabaseAdmin as any)
        .from('client_workstreams')
        .select(`
          *,
          organization:organizations(id, name, slug)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching workstreams:', error)
        return errorResponse('Failed to fetch workstreams')
      }

      // For each workstream, fetch status rollup
      const workstreamsWithStatus = await Promise.all(
        (workstreams || []).map(async (ws: any) => {
          const { data: verticalRollups } = await (supabaseAdmin as any)
            .from('workstream_vertical_status')
            .select('*')
            .eq('workstream_id', ws.id)

          let overallStatus: 'green' | 'yellow' | 'red' = 'green'
          let totalEntries = 0

          if (verticalRollups && verticalRollups.length > 0) {
            const hasRed = verticalRollups.some((v: any) => v.rollup_status === 'red')
            const hasYellow = verticalRollups.some((v: any) => v.rollup_status === 'yellow')
            totalEntries = verticalRollups.reduce((sum: number, v: any) => sum + v.total_entries, 0)

            if (hasRed) overallStatus = 'red'
            else if (hasYellow) overallStatus = 'yellow'
          }

          return {
            ...ws,
            vertical_rollups: verticalRollups || [],
            overall_status: overallStatus,
            total_entries: totalEntries,
          }
        })
      )

      return successResponse({ workstreams: workstreamsWithStatus })
    }

    // POST - Create workstream for org (admin/manager only)
    if (event.httpMethod === 'POST') {
      if (!['admin', 'manager'].includes(userRole)) {
        return errorResponse('Admin access required', 403)
      }

      const body = JSON.parse(event.body || '{}')

      // Validate input
      const validation = CreateWorkstreamSchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(validation.error.errors[0].message, 400)
      }

      const data = validation.data

      // Check if workstream already exists for this org
      const { data: existing } = await (supabaseAdmin as any)
        .from('client_workstreams')
        .select('id')
        .eq('org_id', data.org_id)
        .single()

      if (existing) {
        return errorResponse('Workstream already exists for this organization', 400)
      }

      // Insert workstream
      const { data: workstream, error } = await (supabaseAdmin as any)
        .from('client_workstreams')
        .insert({
          ...data,
          created_by: userId,
        })
        .select(`
          *,
          organization:organizations(id, name, slug)
        `)
        .single()

      if (error) {
        console.error('Error creating workstream:', error)
        return errorResponse('Failed to create workstream')
      }

      // Log activity
      await (supabaseAdmin as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_created',
        entity_type: 'client_workstream',
        entity_id: workstream.id,
        metadata: {
          org_id: data.org_id,
          name: data.name,
        } as any,
      })

      return { statusCode: 201, body: JSON.stringify(successResponse({ workstream })) }
    }

    // PATCH - Update workstream metadata (admin/manager only)
    if (event.httpMethod === 'PATCH') {
      if (!['admin', 'manager'].includes(userRole)) {
        return errorResponse('Admin access required', 403)
      }

      if (!workstreamId) {
        return errorResponse('Workstream ID is required', 400)
      }

      const body = JSON.parse(event.body || '{}')

      // Validate input
      const validation = UpdateWorkstreamSchema.safeParse(body)
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

    // DELETE - Delete workstream (admin/manager only)
    if (event.httpMethod === 'DELETE') {
      if (!['admin', 'manager'].includes(userRole)) {
        return errorResponse('Admin access required', 403)
      }

      if (!workstreamId) {
        return errorResponse('Workstream ID is required', 400)
      }

      // Hard delete (will cascade to entries due to FK)
      const { data: workstream, error } = await (supabaseAdmin as any)
        .from('client_workstreams')
        .delete()
        .eq('id', workstreamId)
        .select('id, org_id, name')
        .single()

      if (error) {
        console.error('Error deleting workstream:', error)
        return errorResponse('Failed to delete workstream')
      }

      // Log activity
      await (supabaseAdmin as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_deleted',
        entity_type: 'client_workstream',
        entity_id: workstream.id,
        metadata: {
          org_id: workstream.org_id,
          name: workstream.name,
        } as any,
      })

      return successResponse({ message: 'Workstream deleted successfully' })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse('Internal server error')
  }
}, { requireAuth: true })
