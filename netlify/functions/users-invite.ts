import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
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
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can invite users' }),
      }
    }

    const { email, fullName, role, orgId } = JSON.parse(event.body || '{}')

    // Validate inputs
    if (!email || !fullName || !role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email, full name, and role are required' }),
      }
    }

    if (role !== 'admin' && role !== 'client') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid role' }),
      }
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'User with this email already exists' }),
      }
    }

    // Log the invitation (in production, send actual email)
    console.log('Invitation would be sent:', {
      email,
      fullName,
      role,
      orgId,
    })

    // In production, you would:
    // 1. Create an invitation record in an 'invitations' table
    // 2. Send an email with a signup link
    // 3. Use Supabase Admin API to generate invite link
    // 4. Or use a service like SendGrid/Resend for emails

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Invitation sent successfully',
        details: {
          email,
          fullName,
          role,
        },
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
