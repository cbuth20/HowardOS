import { Handler } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse, errorResponse } from './lib/responses'
import {
  CreateWorkstreamTemplateSchema,
  UpdateWorkstreamTemplateSchema,
} from '../../src/types/schemas'

/**
 * GET /api/workstreams - List all templates (with filters)
 * GET /api/workstreams?id={id} - Get single template
 * POST /api/workstreams - Create template
 * PATCH /api/workstreams?id={id} - Update template
 * DELETE /api/workstreams?id={id} - Soft delete template
 *
 * Admin-only access
 */
export const handler: Handler = withMiddleware(async (event, context: AuthContext) => {
  const supabase = context.supabase
  const userId = context.user?.id

  if (!userId) {
    return errorResponse('Unauthorized', 401)
  }

  const params = event.queryStringParameters || {}
  const templateId = params.id

  try {
    // GET - List templates or get single template
    if (event.httpMethod === 'GET') {
      // Get single template by ID
      if (templateId) {
        const { data: template, error } = await (supabase as any)
          .from('workstream_templates')
          .select(`
            *,
            vertical:workstream_verticals(*)
          `)
          .eq('id', templateId)
          .single()

        if (error) {
          console.error('Error fetching template:', error)
          return errorResponse('Template not found', 404)
        }

        return successResponse({ template })
      }

      // List all templates with filters
      let query = (supabase as any)
        .from('workstream_templates')
        .select(`
          *,
          vertical:workstream_verticals(*)
        `)
        .order('display_order', { ascending: true })

      // Apply filters
      if (params.vertical_id) {
        query = query.eq('vertical_id', params.vertical_id)
      }
      if (params.timing) {
        query = query.eq('timing', params.timing)
      }
      if (params.is_active !== undefined) {
        query = query.eq('is_active', params.is_active === 'true')
      }
      if (params.search) {
        query = query.ilike('name', `%${params.search}%`)
      }

      const { data: templates, error } = await (query as any)

      if (error) {
        console.error('Error fetching templates:', error)
        return errorResponse('Failed to fetch templates')
      }

      return successResponse({ templates })
    }

    // POST - Create template
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')

      // Validate input
      const validation = CreateWorkstreamTemplateSchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(validation.error.errors[0].message, 400)
      }

      const data = validation.data

      // Insert template
      const { data: template, error } = await (supabase as any)
        .from('workstream_templates')
        .insert({
          ...data,
          created_by: userId,
        })
        .select(`
          *,
          vertical:workstream_verticals(*)
        `)
        .single()

      if (error) {
        console.error('Error creating template:', error)
        return errorResponse('Failed to create template')
      }

      // Log activity
      await (supabase as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_template_created',
        entity_type: 'workstream_template',
        entity_id: template.id,
        metadata: { template_name: template.name } as any,
      })

      return { statusCode: 201, body: JSON.stringify(successResponse({ template })) }
    }

    // PATCH - Update template
    if (event.httpMethod === 'PATCH') {
      if (!templateId) {
        return errorResponse('Template ID is required', 400)
      }

      const body = JSON.parse(event.body || '{}')

      // Validate input
      const validation = UpdateWorkstreamTemplateSchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(validation.error.errors[0].message, 400)
      }

      const data = validation.data

      // Update template
      const { data: template, error } = await (supabase as any)
        .from('workstream_templates')
        .update(data)
        .eq('id', templateId)
        .select(`
          *,
          vertical:workstream_verticals(*)
        `)
        .single()

      if (error) {
        console.error('Error updating template:', error)
        return errorResponse('Failed to update template')
      }

      // Log activity
      await (supabase as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_template_updated',
        entity_type: 'workstream_template',
        entity_id: template.id,
        metadata: { template_name: template.name } as any,
      })

      return successResponse({ template })
    }

    // DELETE - Soft delete template
    if (event.httpMethod === 'DELETE') {
      if (!templateId) {
        return errorResponse('Template ID is required', 400)
      }

      // Soft delete by setting is_active = false
      const { data: template, error } = await (supabase as any)
        .from('workstream_templates')
        .update({ is_active: false })
        .eq('id', templateId)
        .select('id, name')
        .single()

      if (error) {
        console.error('Error deleting template:', error)
        return errorResponse('Failed to delete template')
      }

      // Log activity
      await (supabase as any).from('activity_log').insert({
        user_id: userId,
        action: 'workstream_template_deleted',
        entity_type: 'workstream_template',
        entity_id: template.id,
        metadata: { template_name: template.name } as any,
      })

      return successResponse({ message: 'Template deleted successfully' })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse('Internal server error')
  }
}, { requireAuth: true, requireAdmin: true })
