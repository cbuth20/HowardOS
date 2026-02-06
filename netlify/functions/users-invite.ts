import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'
import { InviteUserSchema } from '../../src/types/schemas'

export const handler = withMiddleware(async (event: HandlerEvent, { profile, supabase }: AuthContext) => {
  const body = JSON.parse(event.body || '{}')

  // Validate with Zod
  const validation = InviteUserSchema.safeParse({
    email: body.email,
    full_name: body.fullName || body.full_name,
    role: body.role,
    org_id: body.orgId || body.org_id,
  })

  if (!validation.success) {
    throw {
      statusCode: 400,
      message: 'Validation failed',
      details: validation.error.format(),
    }
  }

  const { email, full_name, role, org_id } = validation.data

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    throw { statusCode: 409, message: 'User with this email already exists' }
  }

  // Log the invitation (in production, send actual email)
  console.log('Invitation would be sent:', {
    email,
    full_name,
    role,
    org_id,
  })

  // In production, you would:
  // 1. Create an invitation record in an 'invitations' table
  // 2. Send an email with a signup link
  // 3. Use Supabase Admin API to generate invite link
  // 4. Or use a service like SendGrid/Resend for emails

  return successResponse({
    message: 'Invitation sent successfully',
    details: {
      email,
      full_name,
      role,
    },
  })
}, { requireAuth: true, requireAdmin: true })
