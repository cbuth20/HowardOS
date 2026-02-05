import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
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
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

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

    // Handle POST - Share file
    if (event.httpMethod === 'POST') {
      if (profile.role !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Admin access required' }),
        }
      }

      const { fileId, userIds, permission = 'view' } = JSON.parse(event.body || '{}')

      if (!fileId || !userIds || !Array.isArray(userIds)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'fileId and userIds array required' }),
        }
      }

      // Verify file exists
      const { data: file, error: fileError } = await supabase
        .from('files')
        .select('id, org_id, name')
        .eq('id', fileId)
        .single()

      if (fileError || !file) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'File not found' }),
        }
      }

      if (file.org_id !== profile.org_id) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Permission denied' }),
        }
      }

      // Remove existing permissions
      await supabase
        .from('file_permissions')
        .delete()
        .eq('file_id', fileId)

      // Create new permissions
      const permissions = userIds.map(userId => ({
        file_id: fileId,
        user_id: userId,
        permission,
      }))

      const { error: insertError } = await supabase
        .from('file_permissions')
        .insert(permissions)

      if (insertError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to create permissions', details: insertError.message }),
        }
      }

      // Log activity
      await supabase.from('activity_log').insert({
        org_id: profile.org_id,
        user_id: user.id,
        action: 'file_shared',
        entity_type: 'file',
        entity_id: fileId,
        metadata: {
          file_name: file.name,
          shared_with_count: userIds.length,
        },
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `File shared with ${userIds.length} user(s)`,
        }),
      }
    }

    // Handle GET - Get file permissions
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const fileId = params.fileId

      if (!fileId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'fileId required' }),
        }
      }

      const { data: permissions, error } = await supabase
        .from('file_permissions')
        .select(`
          id,
          permission,
          user_id,
          profiles:user_id (
            id,
            email,
            full_name,
            role
          )
        `)
        .eq('file_id', fileId)

      if (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to get permissions' }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          permissions: permissions || [],
        }),
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    }
  }
}
