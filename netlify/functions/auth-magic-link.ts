import { HandlerEvent } from '@netlify/functions'
import { withMiddleware } from './lib/middleware'
import { successResponse, errorResponse } from './lib/responses'
import { createClient } from '@supabase/supabase-js'
import { sendMagicLinkEmail } from '../../packages/ui/lib/email/postmark'

// This endpoint doesn't require auth (it's for logging in)
export const handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { email } = body

    if (!email) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorResponse('Email is required')),
      }
    }

    // Use admin client to generate magic link without sending Supabase email
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check if user exists and is active
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, is_active')
      .eq('email', email)
      .single()

    if (!profile) {
      // Don't reveal if user exists or not for security
      return successResponse({
        message: 'If an account exists with this email, a magic link has been sent.',
      })
    }

    if (!profile.is_active) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorResponse('This account is not active. Please contact your administrator.')),
      }
    }

    // Generate magic link using Admin API (doesn't trigger Supabase email)
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (magicLinkError) {
      console.error('Magic link generation error:', magicLinkError)
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorResponse('Failed to generate magic link')),
      }
    }

    // Send email via Postmark ONLY
    try {
      await sendMagicLinkEmail({
        to: email,
        magicLink: magicLinkData.properties.action_link,
        fullName: profile.full_name,
      })
    } catch (emailError) {
      console.error('Error sending magic link email:', emailError)
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorResponse('Failed to send magic link email')),
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(successResponse({
        message: 'Magic link sent! Check your email.',
      })),
    }
  } catch (error: any) {
    console.error('Magic link endpoint error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorResponse(error.message || 'Internal server error')),
    }
  }
}
