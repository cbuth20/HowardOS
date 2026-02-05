import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Profile not found' }),
      }
    }

    // Handle GET - List files
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const folderPath = params.folderPath || '/'
      const view = params.view || 'all'

      // For clients, get files uploaded by them OR shared with them
      if (profile.role === 'client') {
        const { data: sharedFileIds } = await supabase
          .from('file_permissions')
          .select('file_id')
          .eq('user_id', user.id)

        const sharedIds = sharedFileIds?.map(p => p.file_id) || []

        const { data: files, error: filesError } = await supabase
          .from('files')
          .select(`
            *,
            uploaded_by_profile:profiles!files_uploaded_by_fkey(
              id,
              full_name,
              email
            )
          `)
          .or(`uploaded_by.eq.${user.id}${sharedIds.length > 0 ? `,id.in.(${sharedIds.join(',')})` : ''}`)
          .eq('folder_path', folderPath)
          .order('created_at', { ascending: false })

        if (filesError) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch files', details: filesError.message }),
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            files: files || [],
            view: 'client',
            folderPath,
          }),
        }
      }

      // For admins
      let query = supabase
        .from('files')
        .select(`
          *,
          uploaded_by_profile:profiles!files_uploaded_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('org_id', profile.org_id)
        .eq('folder_path', folderPath)
        .order('created_at', { ascending: false })

      if (view === 'my-files') {
        query = query.eq('uploaded_by', user.id)
      }

      const { data: files, error: filesError } = await query

      if (filesError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch files', details: filesError.message }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          files: files || [],
          view,
          folderPath,
        }),
      }
    }

    // Handle DELETE - Delete file
    if (event.httpMethod === 'DELETE') {
      const params = event.queryStringParameters || {}
      const fileId = params.id

      if (!fileId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'File ID required' }),
        }
      }

      // Get file record
      const { data: file, error: fileError } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single()

      if (fileError || !file) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'File not found' }),
        }
      }

      // Check permissions
      const canDelete = profile.role === 'admin' || file.uploaded_by === user.id

      if (!canDelete) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Permission denied' }),
        }
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.storage_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to delete file from storage' }),
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)

      if (dbError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to delete file record' }),
        }
      }

      // Log activity
      await supabase.from('activity_log').insert({
        org_id: profile.org_id,
        user_id: user.id,
        action: 'file_deleted',
        entity_type: 'file',
        entity_id: fileId,
        metadata: {
          file_name: file.name,
        },
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'File deleted successfully',
        }),
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error: any) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    }
  }
}
