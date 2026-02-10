import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'
import { InviteUserSchema } from '../../src/types/schemas'
import { createAdminClient } from '../../src/lib/supabase/admin'
import { sendInvitationEmail } from '../../src/lib/email/resend'

export const handler = withMiddleware(async (event: HandlerEvent, { profile, supabase }: AuthContext) => {
  console.log('=== USERS INVITE HANDLER START ===')
  const body = JSON.parse(event.body || '{}')
  console.log('Request body:', body)

  // Validate with Zod
  const validation = InviteUserSchema.safeParse({
    email: body.email,
    full_name: body.fullName || body.full_name,
    role: body.role,
    org_id: body.orgId || body.org_id,
  })

  if (!validation.success) {
    console.error('Validation failed:', validation.error.format())
    throw {
      statusCode: 400,
      message: 'Validation failed',
      details: validation.error.format(),
    }
  }

  const { email, full_name, role, org_id } = validation.data
  console.log('Validated data:', { email, full_name, role, org_id })

  // Use admin client
  console.log('Creating admin client...')
  let adminClient
  try {
    adminClient = createAdminClient()
    console.log('Admin client created successfully')
  } catch (error) {
    console.error('Failed to create admin client:', error)
    throw error
  }

  // Check if user already exists in profiles (use admin client to bypass RLS)
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id, is_active')
    .eq('email', email)
    .single() as { data: { id: string; is_active: boolean } | null }

  if (existingProfile && existingProfile.is_active) {
    throw { statusCode: 409, message: 'User with this email already exists and is active' }
  }

  // Check if auth user exists by trying to get user by email
  const { data: { users: authUsers }, error: getUserError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  const existingAuthUser = authUsers?.find(u => u.email === email)

  console.log('Checking for existing user:', {
    email,
    existingProfile: !!existingProfile,
    existingProfileId: existingProfile?.id,
    existingAuthUser: !!existingAuthUser,
    existingAuthUserId: existingAuthUser?.id,
  })

  // Handle orphaned profile (profile exists but no auth user)
  if (existingProfile && !existingAuthUser) {
    console.log('Found orphaned profile, cleaning it up:', existingProfile.id)
    const { error: deleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', existingProfile.id)

    if (deleteError) {
      console.error('Failed to delete orphaned profile:', deleteError)
    } else {
      console.log('Orphaned profile deleted successfully')
    }
  }

  // Get inviter's name for the email
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', profile.id)
    .single() as { data: { full_name: string } | null }

  const inviterName = inviterProfile?.full_name || 'Your administrator'

  let userId: string

  // If auth user exists (and profile might exist or not)
  if (existingAuthUser && existingProfile) {
    console.log('Auth user exists, updating/creating profile')
    userId = existingAuthUser.id

    // Update or create profile (use admin client to bypass RLS)
    if (existingProfile) {
      // Update existing profile
      console.log('Updating existing profile')
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({
          full_name,
          role,
          org_id,
          is_active: false,
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw {
          statusCode: 500,
          message: 'Failed to update user profile',
        }
      }
    } else {
      // Create profile for existing auth user
      console.log('Creating profile for existing auth user')
      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name,
          role,
          org_id,
          is_active: false,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw {
          statusCode: 500,
          message: 'Failed to create user profile',
        }
      }
    }
  } else {
    console.log('Creating new auth user and profile')
    // Create new auth user (not using inviteUserByEmail which triggers Supabase email)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: false, // User needs to confirm via our magic link
      user_metadata: {
        full_name,
        role,
        org_id,
      },
    })

    if (authError) {
      console.error('Supabase user creation error:', authError)
      throw {
        statusCode: 500,
        message: `Failed to create user: ${authError.message}`,
      }
    }

    console.log('Auth user created:', authData.user.id)
    userId = authData.user.id

    // The auto-create trigger already created a basic profile
    // Now we need to UPDATE it with the correct org_id, role, and other fields
    console.log('Updating auto-created profile with data:', { userId, email, full_name, role, org_id })
    const { data: updatedProfile, error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name,
        role,
        org_id,
        is_active: false, // Will be activated when they accept the invite
      })
      .eq('id', userId)
      .select()
      .single()

    if (profileError) {
      console.error('Profile update error (FULL DETAILS):', JSON.stringify(profileError, null, 2))
      console.error('Error code:', profileError.code)
      console.error('Error message:', profileError.message)
      console.error('Error details:', profileError.details)
      console.error('Error hint:', profileError.hint)
      // Try to clean up the auth user if profile update fails
      console.log('Cleaning up auth user:', userId)
      await adminClient.auth.admin.deleteUser(userId)
      throw {
        statusCode: 500,
        message: 'Failed to update user profile',
        details: profileError,
      }
    }
    console.log('Profile updated successfully:', updatedProfile)
  }

  // Generate magic link and send ONLY our custom email via Resend
  console.log('Generating magic link for:', email)
  const { data: magicLinkData, error: magicLinkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
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

  console.log('Magic link generated, sending email via Resend')
  // Send invitation email via Resend (this is the ONLY email sent)
  try {
    await sendInvitationEmail({
      to: email,
      inviteLink: magicLinkData.properties.action_link,
      fullName: full_name,
      role,
      inviterName,
    })
    console.log('Invitation email sent successfully to:', email)
  } catch (emailError) {
    console.error('Error sending invitation email:', emailError)
    throw {
      statusCode: 500,
      message: 'Failed to send invitation email',
    }
  }

  return successResponse({
    message: 'Invitation sent successfully',
    details: {
      email,
      full_name,
      role,
    },
  })
}, { requireAuth: true, requireAdmin: true })
