import { Handler, HandlerResponse } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

/**
 * Proxy endpoint for private avatar images.
 * No auth check — avatar paths are UUIDs (not guessable),
 * and the app itself is behind auth.
 */
export const handler: Handler = async (event): Promise<HandlerResponse> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const path = event.queryStringParameters?.path

    if (!path) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing path parameter' }),
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('avatars')
      .download(path)

    if (downloadError || !fileData) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Avatar not found' }),
      }
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const ext = path.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentTypeMap[ext || ''] || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
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
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
