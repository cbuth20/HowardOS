import { Handler } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse, errorResponse } from './lib/responses'
import {
  CreateWorkstreamEntrySchema,
  UpdateWorkstreamEntrySchema,
  BulkCreateEntriesSchema,
} from '../../src/types/schemas'

/**
 * GET /api/workstream-entries - List entries (filtered by workstream/vertical/status)
 * GET /api/workstream-entries?id={id} - Get single entry
 * GET /api/workstream-entries/rollup?workstream_id={id} - Get status rollups
 * POST /api/workstream-entries - Create single entry (admin only)
 * POST /api/workstream-entries/bulk - Bulk create entries from templates (admin only)
 * PATCH /api/workstream-entries?id={id} - Update entry (admin only)
 * DELETE /api/workstream-entries?id={id} - Soft delete entry (admin only)
 *
 * Auth required, role-based filtering
 */
export const handler: Handler = withMiddleware(async (event, context: AuthContext) => {
  const supabase = context.supabase
  const supabaseAdmin = context.supabaseAdmin
  const userId = context.user?.id
  const userRole = context.profile?.role
  const userOrgId = context.profile?.org_id

  if (!userId) {
    return errorResponse('Unauthorized', 401)
  }

  const params = event.queryStringParameters || {}
  const entryId = params.id
  const path = event.path

  try {
    // GET /api/workstream-entries/rollup - Get status rollups for a workstream
    if (event.httpMethod === 'GET' && path.includes('/rollup')) {
      const workstreamId = params.workstream_id

      if (!workstreamId) {
        return errorResponse('Workstream ID is required', 400)
      }

      // Check permission: Admin can access any workstream, client can only access their own
      if (userRole === 'client' && userOrgId) {
        const { data: workstream } = await (supabaseAdmin as any)
          .from('client_workstreams')
          .select('org_id')
          .eq('id', workstreamId)
          .single()

        if (!workstream || workstream.org_id !== userOrgId) {
          return errorResponse('Workstream not found', 404)
        }
      }

      // Get vertical rollups from materialized view
      const { data: verticalRollups, error: rollupsError } = await (supabaseAdmin as any)
        .from('workstream_vertical_status')
        .select('*')
        .eq('workstream_id', workstreamId)

      if (rollupsError) {
        console.error('Error fetching vertical rollups:', rollupsError)
        return errorResponse('Failed to fetch status rollups')
      }

      // Calculate overall workstream status (worst status wins)
      let overallStatus: 'green' | 'yellow' | 'red' = 'green'
      if (verticalRollups && verticalRollups.length > 0) {
        const hasRed = verticalRollups.some((v: any) => v.rollup_status === 'red')
        const hasYellow = verticalRollups.some((v: any) => v.rollup_status === 'yellow')

        if (hasRed) overallStatus = 'red'
        else if (hasYellow) overallStatus = 'yellow'
      }

      return successResponse({
        vertical_rollups: verticalRollups || [],
        overall_status: overallStatus,
      })
    }

    // GET - List entries or get single entry
    if (event.httpMethod === 'GET') {
      // Get single entry by ID
      if (entryId) {
        let query = (supabaseAdmin as any)
          .from('workstream_entries')
          .select(`
            *,
            vertical:workstream_verticals(*),
            point_person:profiles!workstream_entries_point_person_id_fkey(
              id, full_name, email, avatar_url
            ),
            template:workstream_templates(id, name),
            workstream:client_workstreams(id, org_id, name)
          `)
          .eq('id', entryId)

        // Clients can only see entries in their org's workstream
        if (userRole === 'client' && userOrgId) {
          query = query.eq('workstream.org_id', userOrgId)
        }

        const { data: entry, error } = await query.single()

        if (error) {
          console.error('Error fetching entry:', error)
          return errorResponse('Entry not found', 404)
        }

        return successResponse({ entry })
      }

      // List all entries with filters
      let query = (supabaseAdmin as any)
        .from('workstream_entries')
        .select(`
          *,
          vertical:workstream_verticals(*),
          point_person:profiles!workstream_entries_point_person_id_fkey(
            id, full_name, email, avatar_url
          ),
          template:workstream_templates(id, name),
          workstream:client_workstreams(id, org_id, name)
        `)

      // Apply filters
      if (params.workstream_id) {
        query = query.eq('workstream_id', params.workstream_id)

        // Clients can only see entries in their org's workstream
        if (userRole === 'client' && userOrgId) {
          // Verify workstream belongs to client's org
          const { data: workstream } = await (supabaseAdmin as any)
            .from('client_workstreams')
            .select('org_id')
            .eq('id', params.workstream_id)
            .single()

          if (!workstream || workstream.org_id !== userOrgId) {
            return successResponse({ entries: [] })
          }
        }
      }

      if (params.vertical_id) {
        query = query.eq('vertical_id', params.vertical_id)
      }

      if (params.status) {
        query = query.eq('status', params.status)
      }

      if (params.point_person_id) {
        query = query.eq('point_person_id', params.point_person_id)
      }

      if (params.is_active !== undefined) {
        query = query.eq('is_active', params.is_active === 'true')
      } else {
        // Default to only active entries
        query = query.eq('is_active', true)
      }

      // Apply ordering
      query = query.order('display_order', { ascending: true })

      const { data: entries, error } = await query

      if (error) {
        console.error('Error fetching entries:', error)
        return errorResponse('Failed to fetch entries')
      }

      return successResponse({ entries })
    }

    // POST - Create single entry or bulk create from templates (admin only)
    if (event.httpMethod === 'POST') {
      if (userRole !== 'admin') {
        return errorResponse('Admin access required', 403)
      }

      const body = JSON.parse(event.body || '{}')

      // Check if this is a bulk creation request
      if (path.includes('/bulk')) {
        // Validate input
        const validation = BulkCreateEntriesSchema.safeParse(body)
        if (!validation.success) {
          return errorResponse(validation.error.errors[0].message, 400)
        }

        const data = validation.data

        // Fetch templates
        const { data: templates, error: templatesError } = await (supabaseAdmin as any)
          .from('workstream_templates')
          .select('*, vertical:workstream_verticals(*)')
          .in('id', data.template_ids)

        if (templatesError || !templates || templates.length === 0) {
          return errorResponse('Templates not found', 404)
        }

        // Get current max display_order for the workstream
        const { data: maxOrderEntry } = await (supabaseAdmin as any)
          .from('workstream_entries')
          .select('display_order')
          .eq('workstream_id', data.workstream_id)
          .order('display_order', { ascending: false })
          .limit(1)
          .single()

        let currentOrder = maxOrderEntry?.display_order || 0

        // Create entries from templates
        const entriesToCreate = templates.map((template: any) => ({
          workstream_id: data.workstream_id,
          vertical_id: template.vertical_id,
          name: template.name,
          description: template.description,
          associated_software: template.associated_software,
          timing: template.timing,
          status: 'yellow',
          custom_sop: template.default_sop,
          display_order: ++currentOrder,
          template_id: template.id,
        }))

        const { data: entries, error } = await (supabaseAdmin as any)
          .from('workstream_entries')
          .insert(entriesToCreate)
          .select(`
            *,
            vertical:workstream_verticals(*),
            point_person:profiles!workstream_entries_point_person_id_fkey(
              id, full_name, email, avatar_url
            ),
            template:workstream_templates(id, name)
          `)

        if (error) {
          console.error('Error bulk creating entries:', error)
          return errorResponse('Failed to create entries')
        }

        // Log activity
        await (supabaseAdmin as any).from('activity_log').insert({
          user_id: userId,
          action: 'workstream_entries_bulk_created',
          entity_type: 'workstream_entry',
          metadata: {
            workstream_id: data.workstream_id,
            template_ids: data.template_ids,
            count: entries.length,
          } as any,
        })

        return { statusCode: 201, body: JSON.stringify(successResponse({ entries })) }
      }

      // Single entry creation
      const validation = CreateWorkstreamEntrySchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(validation.error.errors[0].message, 400)
      }

      const data = validation.data

      // Insert entry
      const { data: entry, error } = await (supabaseAdmin as any)
        .from('workstream_entries')
        .insert(data)
        .select(`
          *,
          vertical:workstream_verticals(*),
          point_person:profiles!workstream_entries_point_person_id_fkey(
            id, full_name, email, avatar_url
          ),
          template:workstream_templates(id, name)
        `)
        .single()

      if (error) {
        console.error('Error creating entry:', error)
        return errorResponse('Failed to create entry')
      }

      // Log activity
      await (supabaseAdmin as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_entry_created',
        entity_type: 'workstream_entry',
        entity_id: entry.id,
        metadata: {
          workstream_id: data.workstream_id,
          name: data.name,
        } as any,
      })

      return { statusCode: 201, body: JSON.stringify(successResponse({ entry })) }
    }

    // PATCH - Update entry (admin only)
    if (event.httpMethod === 'PATCH') {
      if (userRole !== 'admin') {
        return errorResponse('Admin access required', 403)
      }

      if (!entryId) {
        return errorResponse('Entry ID is required', 400)
      }

      const body = JSON.parse(event.body || '{}')

      // Validate input
      const validation = UpdateWorkstreamEntrySchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(validation.error.errors[0].message, 400)
      }

      const data = validation.data

      // Update entry
      const { data: entry, error } = await (supabaseAdmin as any)
        .from('workstream_entries')
        .update(data)
        .eq('id', entryId)
        .select(`
          *,
          vertical:workstream_verticals(*),
          point_person:profiles!workstream_entries_point_person_id_fkey(
            id, full_name, email, avatar_url
          ),
          template:workstream_templates(id, name)
        `)
        .single()

      if (error) {
        console.error('Error updating entry:', error)
        return errorResponse('Failed to update entry')
      }

      // Log activity
      await (supabaseAdmin as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_entry_updated',
        entity_type: 'workstream_entry',
        entity_id: entry.id,
        metadata: {
          changes: data,
        } as any,
      })

      return successResponse({ entry })
    }

    // DELETE - Soft delete entry (admin only)
    if (event.httpMethod === 'DELETE') {
      if (userRole !== 'admin') {
        return errorResponse('Admin access required', 403)
      }

      if (!entryId) {
        return errorResponse('Entry ID is required', 400)
      }

      // Soft delete by setting is_active = false
      const { data: entry, error } = await (supabaseAdmin as any)
        .from('workstream_entries')
        .update({ is_active: false })
        .eq('id', entryId)
        .select('id, workstream_id, name')
        .single()

      if (error) {
        console.error('Error deleting entry:', error)
        return errorResponse('Failed to delete entry')
      }

      // Log activity
      await (supabaseAdmin as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_entry_deleted',
        entity_type: 'workstream_entry',
        entity_id: entry.id,
        metadata: {
          workstream_id: entry.workstream_id,
          name: entry.name,
        } as any,
      })

      return successResponse({ message: 'Entry deleted successfully' })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse('Internal server error')
  }
}, { requireAuth: true })
