import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
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

    if (!profile || profile.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' }),
      }
    }

    // Get all client users from other organizations
    const { data: clients, error: clientsError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        org_id,
        organizations (
          id,
          name,
          slug
        )
      `)
      .eq('role', 'client')
      .neq('org_id', profile.org_id)
      .eq('is_active', true)
      .order('full_name')

    if (clientsError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to get clients', details: clientsError.message }),
      }
    }

    // Group by organization
    const clientsByOrg = (clients || []).reduce((acc: any, client: any) => {
      const orgName = client.organizations?.name || 'Unknown'
      if (!acc[orgName]) {
        acc[orgName] = []
      }
      acc[orgName].push({
        id: client.id,
        email: client.email,
        full_name: client.full_name,
        role: client.role,
        org_id: client.org_id,
        org_name: orgName,
      })
      return acc
    }, {})

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        clients: clients || [],
        clientsByOrg,
      }),
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    }
  }
}
