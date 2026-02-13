import { Handler, HandlerResponse } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

/**
 * Proxy endpoint for private avatar images
 * Authenticates user and streams avatar from private storage
 */
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

    // First verify user is authenticated
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth failed:', authError?.message || 'No user')
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    const params = event.queryStringParameters || {}
    const path = params.path

    if (!path) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing path parameter' }),
      }
    }

    // Avatars are accessible to all authenticated users
    // Use service role WITHOUT user JWT to bypass RLS
    const supabaseService = createClient(supabaseUrl, supabaseKey)

    // Download from storage using pure service role (bypasses RLS)
    const { data: fileData, error: downloadError } = await supabaseService.storage
      .from('avatars')
      .download(path)

    if (downloadError || !fileData) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Avatar not found' }),
      }
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer())

    // Determine content type from file extension
    const ext = path.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    }
    const contentType = contentTypeMap[ext || ''] || 'image/jpeg'

    // Return image with caching headers
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Length': buffer.length.toString(),
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (error: any) {
    console.error('Error serving avatar:', error)
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    }
  }
}
