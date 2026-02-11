import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'
import { ShareFileSchema } from '../../src/types/schemas'
import { sendFileNotificationEmail } from '../../src/lib/email/postmark'

export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, supabase }: AuthContext) => {
  const method = event.httpMethod

  if (method === 'POST') {
    return handleShareFile(event, user, profile, supabase)
  }
  if (method === 'GET') {
    return handleGetPermissions(event, supabase)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true })

async function handleShareFile(event: HandlerEvent, user: any, profile: any, supabase: any) {
  if (profile.role !== 'admin') {
    throw { statusCode: 403, message: 'Admin access required' }
  }

  const body = JSON.parse(event.body || '{}')

  // Validate with Zod
  const validation = ShareFileSchema.safeParse(body)
  if (!validation.success) {
    throw {
      statusCode: 400,
      message: 'Validation failed',
      details: validation.error.format(),
    }
  }

  const { fileId, userIds, permission } = validation.data

  // Verify file exists
  const { data: file, error: fileError } = await supabase
    .from('files')
    .select('id, org_id, name')
    .eq('id', fileId)
    .single()

  if (fileError || !file) {
    throw { statusCode: 404, message: 'File not found' }
  }

  if (file.org_id !== profile.org_id) {
    throw { statusCode: 403, message: 'Permission denied' }
  }

  // Remove existing permissions
  await supabase
    .from('file_permissions')
    .delete()
    .eq('file_id', fileId)

  // Create new permissions
  const permissions = userIds.map((userId: string) => ({
    file_id: fileId,
    user_id: userId,
    permission,
  }))

  const { error: insertError } = await supabase
    .from('file_permissions')
    .insert(permissions)

  if (insertError) {
    throw { statusCode: 500, message: 'Failed to create permissions', details: insertError.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    org_id: profile.org_id,
    user_id: user.id,
    action: 'file_shared',
    entity_type: 'file',
    entity_id: fileId,
    metadata: {
      file_name: file.name,
      shared_with_count: userIds.length,
    },
  })

  // Send email notifications
  try {
    // Get uploader's name
    const { data: uploaderProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single() as { data: { full_name: string; email: string } | null }

    const uploaderName = uploaderProfile?.full_name || uploaderProfile?.email || 'Someone'

    // Get all admins in the organization
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('org_id', profile.org_id)
      .eq('role', 'admin')
      .eq('is_active', true) as { data: Array<{ id: string; email: string; full_name: string }> | null }

    // Get the users who were shared the file
    const { data: sharedUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .in('id', userIds) as { data: Array<{ id: string; email: string; full_name: string; role: string }> | null }

    // Link directly to files page - could be enhanced to link to specific file
    const filesUrl = `${process.env.NEXT_PUBLIC_APP_URL}/files?highlight=${fileId}`

    // Send to all recipients (admins + shared users, excluding the uploader)
    const recipients = [
      ...(admins || []),
      ...(sharedUsers || [])
    ].filter((recipient, index, self) =>
      // Remove duplicates and exclude the uploader
      recipient.id !== user.id &&
      index === self.findIndex(r => r.id === recipient.id)
    )

    // Send emails in parallel
    await Promise.allSettled(
      recipients.map(recipient =>
        sendFileNotificationEmail({
          to: recipient.email,
          recipientName: recipient.full_name || recipient.email,
          uploaderName,
          files: [{ name: file.name }],
          filesUrl,
        })
      )
    )

    console.log(`Sent file notification emails to ${recipients.length} recipient(s)`)
  } catch (emailError) {
    console.error('Error sending file notification emails:', emailError)
    // Don't fail the entire request if email fails
  }

  return successResponse({
    message: `File shared with ${userIds.length} user(s)`,
  })
}

async function handleGetPermissions(event: HandlerEvent, supabase: any) {
  const params = event.queryStringParameters || {}
  const fileId = params.fileId

  if (!fileId) {
    throw { statusCode: 400, message: 'fileId required' }
  }

  const { data: permissions, error } = await supabase
    .from('file_permissions')
    .select(`
      id,
      permission,
      user_id,
      profiles:user_id (
        id,
        email,
        full_name,
        role
      )
    `)
    .eq('file_id', fileId)

  if (error) {
    throw { statusCode: 500, message: 'Failed to get permissions' }
  }

  return successResponse({
    permissions: permissions || [],
  })
}
