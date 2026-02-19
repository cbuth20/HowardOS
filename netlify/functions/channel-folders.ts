import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext, isAdminOrManagerRole } from './lib/middleware'
import { successResponse } from './lib/responses'
import { CreateChannelFolderSchema } from '../../packages/ui/types/schemas'

const FOLDER_SELECT_QUERY = `
  *,
  created_by_profile:profiles!channel_folders_created_by_fkey(
    id, full_name, email
  )
`

export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, supabase, supabaseAdmin }: AuthContext) => {
  const method = event.httpMethod
  const params = event.queryStringParameters || {}

  if (method === 'GET') {
    return handleGetFolders(params, profile, supabaseAdmin)
  }
  if (method === 'POST') {
    return handleCreateFolder(event, user, profile, supabaseAdmin)
  }
  if (method === 'DELETE' && params.id) {
    return handleDeleteFolder(params.id, user, profile, supabaseAdmin)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true })

async function handleGetFolders(params: Record<string, string | undefined>, profile: any, supabase: any) {
  const channelId = params.channelId
  const parentPath = params.parentPath || '/'

  if (!channelId) {
    throw { statusCode: 400, message: 'channelId is required' }
  }

  // Verify channel access
  const { data: channel } = await supabase
    .from('file_channels')
    .select('id, org_id, client_org_id')
    .eq('id', channelId)
    .single()

  if (!channel || (channel.org_id !== profile.org_id && channel.client_org_id !== profile.org_id)) {
    throw { statusCode: 403, message: 'Access denied' }
  }

  const { data: folders, error } = await supabase
    .from('channel_folders')
    .select(FOLDER_SELECT_QUERY)
    .eq('channel_id', channelId)
    .eq('parent_path', parentPath)
    .order('name', { ascending: true })

  if (error) {
    throw { statusCode: 500, message: 'Failed to fetch folders', details: error.message }
  }

  return successResponse({ folders: folders || [] })
}

async function handleCreateFolder(event: HandlerEvent, user: any, profile: any, supabase: any) {
  if (!isAdminOrManagerRole(profile.role)) {
    throw { statusCode: 403, message: 'Admin or manager access required' }
  }

  const body = JSON.parse(event.body || '{}')
  const parsed = CreateChannelFolderSchema.safeParse(body)

  if (!parsed.success) {
    throw { statusCode: 400, message: 'Validation failed', details: parsed.error.flatten() }
  }

  const { channel_id, name, parent_path } = parsed.data

  // Verify channel ownership
  const { data: channel } = await supabase
    .from('file_channels')
    .select('id, org_id')
    .eq('id', channel_id)
    .eq('org_id', profile.org_id)
    .single()

  if (!channel) {
    throw { statusCode: 404, message: 'Channel not found or access denied' }
  }

  const { data: folder, error } = await supabase
    .from('channel_folders')
    .insert({
      channel_id,
      name,
      parent_path: parent_path || '/',
      created_by: user.id,
    })
    .select(FOLDER_SELECT_QUERY)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw { statusCode: 409, message: 'A folder with this name already exists in this location' }
    }
    throw { statusCode: 500, message: 'Failed to create folder', details: error.message }
  }

  return successResponse({ folder, message: 'Folder created successfully' })
}

async function handleDeleteFolder(id: string, user: any, profile: any, supabase: any) {
  if (!isAdminOrManagerRole(profile.role)) {
    throw { statusCode: 403, message: 'Admin or manager access required' }
  }

  // Get folder and verify ownership
  const { data: folder, error: fetchError } = await supabase
    .from('channel_folders')
    .select(`
      id, name, channel_id, parent_path,
      channel:file_channels!channel_folders_channel_id_fkey(org_id)
    `)
    .eq('id', id)
    .single()

  if (fetchError || !folder) {
    throw { statusCode: 404, message: 'Folder not found' }
  }

  if ((folder as any).channel?.org_id !== profile.org_id) {
    throw { statusCode: 403, message: 'Access denied' }
  }

  // Build the full folder path for this folder
  const folderPath = folder.parent_path === '/'
    ? `/${folder.name}/`
    : `${folder.parent_path}${folder.name}/`

  // Delete files within this folder path in this channel
  await supabase
    .from('files')
    .delete()
    .eq('channel_id', folder.channel_id)
    .like('folder_path', `${folderPath}%`)

  // Delete sub-folders
  await supabase
    .from('channel_folders')
    .delete()
    .eq('channel_id', folder.channel_id)
    .like('parent_path', `${folderPath}%`)

  // Delete the folder itself
  const { error } = await supabase
    .from('channel_folders')
    .delete()
    .eq('id', id)

  if (error) {
    throw { statusCode: 500, message: 'Failed to delete folder', details: error.message }
  }

  return successResponse({ message: 'Folder deleted successfully' })
}
