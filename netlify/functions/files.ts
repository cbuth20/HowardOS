import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext, isTeamRole, isAdminOrManagerRole } from './lib/middleware'
import { successResponse } from './lib/responses'

const FILE_SELECT_QUERY = `
  *,
  uploaded_by_profile:profiles!files_uploaded_by_fkey(
    id,
    full_name,
    email
  )
`

export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, userOrgs, supabase }: AuthContext) => {
  const method = event.httpMethod

  if (method === 'GET') {
    return handleGetFiles(event, user, profile, userOrgs, supabase)
  }
  if (method === 'DELETE') {
    return handleDeleteFile(event, user, profile, supabase)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true })

async function handleGetFiles(event: HandlerEvent, user: any, profile: any, userOrgs: string[], supabase: any) {
  const params = event.queryStringParameters || {}
  const folderPath = params.folderPath || '/'
  const view = params.view || 'all'
  const channelId = params.channelId

  // Channel-scoped file queries
  if (channelId) {
    return handleGetChannelFiles(channelId, folderPath, user, profile, userOrgs, supabase)
  }

  // For clients, get files uploaded by them OR shared with them
  if (profile.role === 'client') {
    const { data: sharedFileIds } = await supabase
      .from('file_permissions')
      .select('file_id')
      .eq('user_id', user.id)

    const sharedIds = sharedFileIds?.map((p: any) => p.file_id) || []

    const { data: files, error: filesError } = await supabase
      .from('files')
      .select(FILE_SELECT_QUERY)
      .or(`uploaded_by.eq.${user.id}${sharedIds.length > 0 ? `,id.in.(${sharedIds.join(',')})` : ''}`)
      .eq('folder_path', folderPath)
      .is('channel_id', null)
      .order('created_at', { ascending: false })

    if (filesError) {
      throw { statusCode: 500, message: 'Failed to fetch files', details: filesError.message }
    }

    return successResponse({
      files: files || [],
      view: 'client',
      folderPath,
    })
  }

  // For team members
  let query = supabase
    .from('files')
    .select(FILE_SELECT_QUERY)
    .eq('folder_path', folderPath)
    .is('channel_id', null)
    .order('created_at', { ascending: false })

  // User role: filter by allowed_org_ids
  if (profile.role === 'user' && profile.allowed_org_ids?.length > 0) {
    query = query.in('org_id', profile.allowed_org_ids)
  } else {
    query = query.eq('org_id', profile.org_id)
  }

  if (view === 'my-files') {
    query = query.eq('uploaded_by', user.id)
  }

  const { data: files, error: filesError } = await query

  if (filesError) {
    throw { statusCode: 500, message: 'Failed to fetch files', details: filesError.message }
  }

  return successResponse({
    files: files || [],
    view,
    folderPath,
  })
}

async function handleGetChannelFiles(channelId: string, folderPath: string, user: any, profile: any, userOrgs: string[], supabase: any) {
  // Verify channel access
  const { data: channel, error: channelError } = await supabase
    .from('file_channels')
    .select(`
      *,
      client_organization:organizations!file_channels_client_org_id_fkey(
        id, name, slug, logo_url
      )
    `)
    .eq('id', channelId)
    .single()

  if (channelError || !channel) {
    throw { statusCode: 404, message: 'Channel not found' }
  }

  // Check access: team members via org_id, clients via user_organizations
  if (isTeamRole(profile.role)) {
    // Team members check: their org owns the channel
    if (channel.org_id !== profile.org_id) {
      throw { statusCode: 403, message: 'Access denied' }
    }
  } else {
    // Client check: their org is the client_org_id
    if (!userOrgs.includes(channel.client_org_id)) {
      throw { statusCode: 403, message: 'Access denied' }
    }
  }

  // Get files in this channel at this folder path
  const { data: files, error: filesError } = await supabase
    .from('files')
    .select(FILE_SELECT_QUERY)
    .eq('channel_id', channelId)
    .eq('folder_path', folderPath)
    .order('name', { ascending: true })

  if (filesError) {
    throw { statusCode: 500, message: 'Failed to fetch files', details: filesError.message }
  }

  // Get folders at this path
  const { data: folders, error: foldersError } = await supabase
    .from('channel_folders')
    .select(`
      *,
      created_by_profile:profiles!channel_folders_created_by_fkey(
        id, full_name, email
      )
    `)
    .eq('channel_id', channelId)
    .eq('parent_path', folderPath)
    .order('name', { ascending: true })

  if (foldersError) {
    throw { statusCode: 500, message: 'Failed to fetch folders', details: foldersError.message }
  }

  return successResponse({
    files: files || [],
    folders: folders || [],
    channel,
    folderPath,
  })
}

async function handleDeleteFile(event: HandlerEvent, user: any, profile: any, supabase: any) {
  const params = event.queryStringParameters || {}
  const fileId = params.id

  if (!fileId) {
    throw { statusCode: 400, message: 'File ID required' }
  }

  // Get file record
  const { data: file, error: fileError } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single()

  if (fileError || !file) {
    throw { statusCode: 404, message: 'File not found' }
  }

  // Check permissions: admin/manager can delete any, uploaders can delete own
  const canDelete = isAdminOrManagerRole(profile.role) || file.uploaded_by === user.id

  if (!canDelete) {
    throw { statusCode: 403, message: 'Permission denied' }
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('files')
    .remove([file.storage_path])

  if (storageError) {
    console.error('Storage delete error:', storageError)
    throw { statusCode: 500, message: 'Failed to delete file from storage' }
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)

  if (dbError) {
    throw { statusCode: 500, message: 'Failed to delete file record' }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    org_id: profile.org_id,
    user_id: user.id,
    action: 'file_deleted',
    entity_type: 'file',
    entity_id: fileId,
    metadata: {
      file_name: file.name,
    },
  })

  return successResponse({ message: 'File deleted successfully' })
}
