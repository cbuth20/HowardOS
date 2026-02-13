import { Handler, HandlerResponse } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export const handler: Handler = async (event): Promise<HandlerResponse> => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    // Try to get token from Authorization header or cookies
    let token: string | undefined
    const authHeader = event.headers.authorization || event.headers.Authorization

    if (authHeader) {
      token = authHeader.replace('Bearer ', '')
    } else {
      // Extract from cookies (Supabase SSR stores auth in cookies)
      const cookies = event.headers.cookie || ''
      console.log('Cookie header:', cookies ? 'present' : 'missing')

      // Try multiple cookie patterns for Supabase SSR
      const patterns = [
        /sb-[^-]+-auth-token=([^;]+)/,           // Standard format
        /sb-[^-]+-auth-token-code-verifier=([^;]+)/, // Code verifier format
        /sb-access-token=([^;]+)/,               // Alternative format
      ]

      for (const pattern of patterns) {
        const match = cookies.match(pattern)
        if (match) {
          try {
            let cookieValue = decodeURIComponent(match[1])
            console.log('Cookie value sample:', cookieValue.substring(0, 50))

            // Supabase SSR encodes cookies as base64
            if (cookieValue.startsWith('base64-')) {
              cookieValue = Buffer.from(cookieValue.substring(7), 'base64').toString('utf-8')
              console.log('Decoded base64 cookie:', cookieValue.substring(0, 50))
            }

            // Try parsing as JSON (Supabase SSR format)
            const parsed = JSON.parse(cookieValue)

            // Handle different formats:
            // - Array: ["access_token", "refresh_token"]
            // - Object: { access_token: "...", ... }
            if (Array.isArray(parsed)) {
              token = parsed[0] // First element is access token
            } else if (parsed.access_token) {
              token = parsed.access_token
            }

            // Validate token format (JWT has 3 parts separated by dots)
            if (token && token.split('.').length === 3) {
              console.log('Token extracted from cookie (valid JWT)')
              break
            } else {
              console.log('Invalid token format, not a JWT:', token?.substring(0, 20))
              token = undefined
            }
          } catch (e) {
            console.error('Cookie parsing error:', e)
          }
        }
      }
    }

    if (!token) {
      console.error('No authentication token found in headers or cookies')
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized - No token found' }),
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    // Use service role to bypass RLS for permission checks
    const supabaseService = createClient(supabaseUrl, supabaseKey)

    const { data: profile } = await supabaseService
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Profile not found' }),
      }
    }

    // Get user's org memberships for multi-org support
    const { data: userOrgs } = await supabaseService
      .from('user_organizations')
      .select('org_id')
      .eq('user_id', user.id)

    const userOrgIds = userOrgs?.map(uo => uo.org_id) || []

    const params = event.queryStringParameters || {}
    const fileId = params.id

    if (!fileId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File ID required' }),
      }
    }

    // Get file record using service role
    const { data: file, error: fileError } = await supabaseService
      .from('files')
      .select('*, channel:file_channels(id, client_org_id)')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File not found' }),
      }
    }

    // Check permissions: admin/manager can access all, others need org membership
    const isTeamRole = ['admin', 'manager', 'user'].includes(profile.role)
    const hasDirectOrgAccess = userOrgIds.includes(file.org_id) || profile.org_id === file.org_id

    // Check channel-based access for client users
    let hasChannelAccess = false
    if (file.channel_id && file.channel) {
      const channelClientOrgId = (file.channel as any)?.client_org_id
      hasChannelAccess = userOrgIds.includes(channelClientOrgId) || profile.org_id === channelClientOrgId
    }

    const hasAccess = isTeamRole || hasDirectOrgAccess || hasChannelAccess

    console.log('Permission check:', {
      userId: user.id,
      userRole: profile.role,
      userPrimaryOrg: profile.org_id,
      userOrgIds,
      fileOrgId: file.org_id,
      fileChannelId: file.channel_id,
      channelClientOrg: file.channel ? (file.channel as any).client_org_id : null,
      isTeamRole,
      hasDirectOrgAccess,
      hasChannelAccess,
      finalDecision: hasAccess ? 'ALLOW' : 'DENY',
    })

    if (!hasAccess) {
      console.error('Access denied:', {
        role: profile.role,
        userOrgs: userOrgIds,
        fileOrg: file.org_id,
        channelOrg: file.channel ? (file.channel as any).client_org_id : null,
      })
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Permission denied',
          debug: {
            role: profile.role,
            hasDirectOrgAccess,
            hasChannelAccess,
            fileOrgId: file.org_id,
            userOrgIds: userOrgIds.length,
          }
        }),
      }
    }

    // Download from storage using service role (bypasses RLS)
    const { data: fileData, error: downloadError } = await supabaseService.storage
      .from('files')
      .download(file.storage_path)

    if (downloadError || !fileData) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to download file' }),
      }
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer())

    // Log activity using service role
    await supabaseService.from('activity_log').insert({
      org_id: file.org_id,
      user_id: user.id,
      action: 'file_downloaded',
      entity_type: 'file',
      entity_id: fileId,
      metadata: {
        file_name: file.name,
      },
    })

    // Return file with appropriate headers
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        'Content-Length': buffer.length.toString(),
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    }
  }
}
