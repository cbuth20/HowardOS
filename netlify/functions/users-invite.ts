import { HandlerEvent } from '@netlify/functions'
import { randomBytes } from 'crypto'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'
import { InviteUserSchema } from '../../src/types/schemas'
import { createAdminClient } from '../../src/lib/supabase/admin'
import { sendInvitationEmail } from '../../src/lib/email/postmark'

function generateTempPassword(): string {
  // Generate a 16-char password to avoid leaked password database conflicts
  // Longer passwords are extremely unlikely to be in HaveIBeenPwned database
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const allChars = uppercase + lowercase + numbers

  const bytes = randomBytes(16)
  let password = ''

  // Generate random password
  for (let i = 0; i < 16; i++) {
    password += allChars[bytes[i] % allChars.length]
  }

  // Ensure at least one of each type by replacing first 3 chars if needed
  const chars = password.split('')
  if (!/[A-Z]/.test(password)) chars[0] = uppercase[bytes[0] % uppercase.length]
  if (!/[a-z]/.test(password)) chars[1] = lowercase[bytes[1] % lowercase.length]
  if (!/[0-9]/.test(password)) chars[2] = numbers[bytes[2] % numbers.length]

  return chars.join('')
}

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
    allowed_org_ids: body.allowed_org_ids || body.allowedOrgIds,
    org_ids: body.org_ids || body.orgIds,
    temp_password: body.tempPassword || body.temp_password,
  })

  if (!validation.success) {
    console.error('Validation failed:', validation.error.format())
    throw {
      statusCode: 400,
      message: 'Validation failed',
      details: validation.error.format(),
    }
  }

  const { email, full_name, role, org_id, allowed_org_ids, org_ids, temp_password } = validation.data
  console.log('Validated data:', { email, full_name, role, org_id })

  // Validate password requirements if provided
  if (temp_password) {
    if (temp_password.length < 8) {
      throw { statusCode: 400, message: 'Password must be at least 8 characters' }
    }
    if (!/[A-Z]/.test(temp_password)) {
      throw { statusCode: 400, message: 'Password must contain at least one uppercase letter' }
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(temp_password)) {
      throw { statusCode: 400, message: 'Password must contain at least one special character (!@#$%^&*...)' }
    }
  }

  // Only admins can create admin/manager roles
  if (['admin', 'manager'].includes(role) && profile.role !== 'admin') {
    throw { statusCode: 403, message: 'Only admins can create admin or manager roles' }
  }

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

  console.log('Checking for existing user:', {
    email,
    existingProfile: !!existingProfile,
    existingProfileId: existingProfile?.id,
  })

  // Get inviter's name for the email
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', profile.id)
    .single() as { data: { full_name: string } | null }

  const inviterName = inviterProfile?.full_name || 'Your administrator'

  // For client_no_access role: create contact (no login access)
  if (role === 'client_no_access') {
    console.log('Creating client_no_access contact')

    // Try to create auth user; if already exists, use existing profile id
    let userId: string

    if (existingProfile) {
      userId = existingProfile.id
      await (adminClient as any)
        .from('profiles')
        .update({
          full_name,
          role: 'client_no_access',
          org_id,
          is_active: true,
        })
        .eq('id', userId)
    } else {
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { full_name, role, org_id },
        ban_duration: '876000h',
      })

      if (authError) {
        console.error('Failed to create auth user for client_no_access:', authError)
        throw { statusCode: 500, message: `Failed to create user: ${authError.message}` }
      }

      userId = authData.user.id

      await (adminClient as any)
        .from('profiles')
        .update({
          full_name,
          role: 'client_no_access',
          org_id,
          is_active: true,
        })
        .eq('id', userId)
    }

    // Upsert user_organizations entry
    await (adminClient as any)
      .from('user_organizations')
      .upsert({ user_id: userId, org_id, is_primary: true }, { onConflict: 'user_id,org_id' })

    // Add additional org memberships
    if (org_ids && org_ids.length > 0) {
      const additionalOrgs = org_ids.filter(id => id !== org_id)
      if (additionalOrgs.length > 0) {
        await (adminClient as any)
          .from('user_organizations')
          .upsert(
            additionalOrgs.map(oid => ({
              user_id: userId,
              org_id: oid,
              is_primary: false,
            })),
            { onConflict: 'user_id,org_id' }
          )
      }
    }

    return successResponse({
      message: 'Contact created successfully (no login access)',
      details: { email, full_name, role },
    })
  }

  // Use admin-provided password or generate one
  const tempPassword = temp_password || generateTempPassword()
  let userId: string

  if (existingProfile) {
    // Re-invite: user exists but hasn't activated — update password and profile
    console.log('Re-inviting inactive user:', existingProfile.id)
    userId = existingProfile.id

    // Reset their password via admin API
    console.log('Resetting password for existing user:', userId)
    console.log('Generated password:', tempPassword) // Debug log
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(userId, {
      password: tempPassword,
    })

    if (passwordError) {
      console.error('Password reset error:', passwordError)
      throw { statusCode: 500, message: 'Failed to reset user password' }
    }
    console.log('Password reset successful for user:', userId)

    const { error: updateError } = await (adminClient as any)
      .from('profiles')
      .update({
        full_name,
        role,
        org_id,
        is_active: true,
        is_onboarded: false,
        ...(role === 'user' && allowed_org_ids ? { allowed_org_ids } : {}),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
      throw { statusCode: 500, message: 'Failed to update user profile' }
    }
  } else {
    // New user: create auth user with temp password
    console.log('Creating new auth user with temp password')
    console.log('Generated password:', tempPassword) // Debug log
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, role, org_id },
    })
    console.log('Auth user creation result:', { success: !!authData, userId: authData?.user?.id, error: authError })

    if (authError) {
      // Handle orphaned auth user (exists in auth but no profile row)
      if (authError.message?.includes('already been registered')) {
        console.log('Orphaned auth user found, recovering via listUsers')

        // List users by email to get the ID
        const { data: listData, error: listError } = await adminClient.auth.admin.listUsers()

        if (listError) {
          console.error('Failed to list users:', listError)
          throw { statusCode: 500, message: 'User exists in auth but recovery failed. Please contact support.' }
        }

        const orphanedUser = listData.users.find(u => u.email === email)
        if (!orphanedUser) {
          throw { statusCode: 500, message: 'User exists in auth but could not be found. Please contact support.' }
        }

        userId = orphanedUser.id

        // Update password for the orphaned user
        const { error: passwordError } = await adminClient.auth.admin.updateUserById(userId, {
          password: tempPassword,
        })

        if (passwordError) {
          console.error('Failed to update orphaned user password:', passwordError)
          throw { statusCode: 500, message: 'Failed to set password for existing user.' }
        }

        // Upsert profile for the orphaned auth user
        const { error: upsertError } = await (adminClient as any)
          .from('profiles')
          .upsert({
            id: userId,
            email,
            full_name,
            role,
            org_id,
            is_active: true,
            is_onboarded: false,
            ...(role === 'user' && allowed_org_ids ? { allowed_org_ids } : {}),
          })

        if (upsertError) {
          console.error('Profile upsert error:', upsertError)
          throw { statusCode: 500, message: 'Failed to create user profile' }
        }
      } else {
        console.error('Supabase user creation error:', authError)
        throw { statusCode: 500, message: `Failed to create user: ${authError.message}` }
      }
    } else {
      console.log('Auth user created:', authData.user.id)
      userId = authData.user.id

      // Update the auto-created profile with correct data
      const { error: profileError } = await (adminClient as any)
        .from('profiles')
        .update({
          full_name,
          role,
          org_id,
          is_active: true,
          is_onboarded: false,
          ...(role === 'user' && allowed_org_ids ? { allowed_org_ids } : {}),
        })
        .eq('id', userId)

      if (profileError) {
        console.error('Profile update error:', profileError)
        await adminClient.auth.admin.deleteUser(userId)
        throw { statusCode: 500, message: 'Failed to update user profile' }
      }
    }
  }

  // Create user_organizations entry for the primary org
  await (adminClient as any)
    .from('user_organizations')
    .upsert({ user_id: userId, org_id, is_primary: true }, { onConflict: 'user_id,org_id' })

  // Add additional org memberships if provided
  if (org_ids && org_ids.length > 0) {
    const additionalOrgs = org_ids.filter(id => id !== org_id)
    if (additionalOrgs.length > 0) {
      await (adminClient as any)
        .from('user_organizations')
        .upsert(
          additionalOrgs.map(oid => ({
            user_id: userId,
            org_id: oid,
            is_primary: false,
          })),
          { onConflict: 'user_id,org_id' }
        )
    }
  }

  // Send invitation email with temp password
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
  console.log('Sending invitation email with temp password to:', email)

  try {
    await sendInvitationEmail({
      to: email,
      tempPassword,
      loginUrl,
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
}, { requireAuth: true, requireRole: ['admin', 'manager'] })
