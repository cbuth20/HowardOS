import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'
import { createAdminClient } from '../../src/lib/supabase/admin'
import { sendMagicLinkEmail } from '../../src/lib/email/resend'

export const handler = withMiddleware(async (event: HandlerEvent, { profile, supabase }: AuthContext) => {
  const body = JSON.parse(event.body || '{}')
  const { userId } = body

  if (!userId) {
    throw {
      statusCode: 400,
      message: 'userId is required',
    }
  }

  // Get the user's profile
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('email, full_name, is_active')
    .eq('id', userId)
    .single() as { data: { email: string; full_name: string; is_active: boolean } | null; error: any }

  if (profileError || !userProfile) {
    throw {
      statusCode: 404,
      message: 'User not found',
    }
  }

  if (!userProfile.is_active) {
    throw {
      statusCode: 400,
      message: 'Cannot send magic link to inactive user',
    }
  }

  // Use admin client to generate magic link
  const adminClient = createAdminClient()

  const { data: magicLinkData, error: magicLinkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: userProfile.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (magicLinkError) {
    console.error('Magic link generation error:', magicLinkError)
    throw {
      statusCode: 500,
      message: `Failed to generate magic link: ${magicLinkError.message}`,
    }
  }

  // Send the magic link email via Resend
  try {
    await sendMagicLinkEmail({
      to: userProfile.email,
      magicLink: magicLinkData.properties.action_link,
      fullName: userProfile.full_name,
    })
  } catch (emailError) {
    console.error('Error sending magic link email:', emailError)
    throw {
      statusCode: 500,
      message: 'Failed to send magic link email',
    }
  }

  return successResponse({
    message: 'Magic link sent successfully',
    details: {
      email: userProfile.email,
    },
  })
}, { requireAuth: true, requireAdmin: true })
