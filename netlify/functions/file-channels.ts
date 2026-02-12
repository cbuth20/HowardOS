import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext, isTeamRole, isAdminOrManagerRole } from './lib/middleware'
import { successResponse } from './lib/responses'
import { CreateFileChannelSchema, UpdateFileChannelSchema } from '../../src/types/schemas'

const CHANNEL_SELECT_QUERY = `
  *,
  client_organization:organizations!file_channels_client_org_id_fkey(
    id, name, slug, logo_url
  ),
  created_by_profile:profiles!file_channels_created_by_fkey(
    id, full_name, email
  )
`

export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, supabase, supabaseAdmin }: AuthContext) => {
  const method = event.httpMethod
  const params = event.queryStringParameters || {}

  if (method === 'GET' && params.id) {
    return handleGetChannel(params.id, profile, supabaseAdmin)
  }
  if (method === 'GET') {
    return handleGetChannels(profile, supabaseAdmin)
  }
  if (method === 'POST') {
    return handleCreateChannel(event, user, profile, supabaseAdmin)
  }
  if (method === 'PATCH' && params.id) {
    return handleUpdateChannel(event, params.id, profile, supabaseAdmin)
  }
  if (method === 'DELETE' && params.id) {
    return handleDeleteChannel(params.id, user, profile, supabaseAdmin)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true })

async function handleGetChannels(profile: any, supabase: any) {
  // Team members see channels they own, clients see channels for their org
  const isTeam = ['admin', 'manager', 'user'].includes(profile.role)
  const filterColumn = isTeam ? 'org_id' : 'client_org_id'

  const { data: channels, error } = await supabase
    .from('file_channels')
    .select(CHANNEL_SELECT_QUERY)
    .eq(filterColumn, profile.org_id)
    .order('updated_at', { ascending: false })

  if (error) {
    throw { statusCode: 500, message: 'Failed to fetch channels', details: error.message }
  }

  // For each channel, get file count and latest activity
  const enrichedChannels = await Promise.all(
    (channels || []).map(async (channel: any) => {
      const { count } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channel.id)

      const { data: latestFile } = await supabase
        .from('files')
        .select('created_at')
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Get primary contact (first active client user in the client org)
      const { data: contact } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('org_id', channel.client_org_id)
        .eq('role', 'client')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      return {
        ...channel,
        file_count: count || 0,
        latest_activity: latestFile?.created_at || channel.updated_at,
        primary_contact: contact || null,
      }
    })
  )

  return successResponse({ channels: enrichedChannels })
}

async function handleGetChannel(id: string, profile: any, supabase: any) {
  const { data: channel, error } = await supabase
    .from('file_channels')
    .select(CHANNEL_SELECT_QUERY)
    .eq('id', id)
    .single()

  if (error || !channel) {
    throw { statusCode: 404, message: 'Channel not found' }
  }

  // Verify access
  if (channel.org_id !== profile.org_id && channel.client_org_id !== profile.org_id) {
    throw { statusCode: 403, message: 'Access denied' }
  }

  const { count } = await supabase
    .from('files')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', id)

  const { data: contact } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('org_id', channel.client_org_id)
    .eq('role', 'client')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  return successResponse({
    channel: {
      ...channel,
      file_count: count || 0,
      primary_contact: contact || null,
    },
  })
}

async function handleCreateChannel(event: HandlerEvent, user: any, profile: any, supabase: any) {
  if (!isAdminOrManagerRole(profile.role)) {
    throw { statusCode: 403, message: 'Admin or manager access required' }
  }

  const body = JSON.parse(event.body || '{}')
  const parsed = CreateFileChannelSchema.safeParse(body)

  if (!parsed.success) {
    throw { statusCode: 400, message: 'Validation failed', details: parsed.error.flatten() }
  }

  const { client_org_id, description } = parsed.data
  let { name } = parsed.data

  // If no name provided, look up client org name
  if (!name) {
    const { data: clientOrg } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', client_org_id)
      .single()

    name = clientOrg?.name || 'Untitled Channel'
  }

  // Check if channel already exists for this client
  const { data: existing } = await supabase
    .from('file_channels')
    .select('id')
    .eq('org_id', profile.org_id)
    .eq('client_org_id', client_org_id)
    .single()

  if (existing) {
    throw { statusCode: 409, message: 'A channel already exists for this client' }
  }

  const { data: channel, error } = await supabase
    .from('file_channels')
    .insert({
      org_id: profile.org_id,
      client_org_id,
      name,
      description: description || null,
      created_by: user.id,
    })
    .select(CHANNEL_SELECT_QUERY)
    .single()

  if (error) {
    throw { statusCode: 500, message: 'Failed to create channel', details: error.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    org_id: profile.org_id,
    user_id: user.id,
    action: 'channel_created',
    entity_type: 'file_channel',
    entity_id: channel.id,
    metadata: { channel_name: name, client_org_id },
  })

  return successResponse({ channel, message: 'Channel created successfully' })
}

async function handleUpdateChannel(event: HandlerEvent, id: string, profile: any, supabase: any) {
  if (!isAdminOrManagerRole(profile.role)) {
    throw { statusCode: 403, message: 'Admin or manager access required' }
  }

  const body = JSON.parse(event.body || '{}')
  const parsed = UpdateFileChannelSchema.safeParse(body)

  if (!parsed.success) {
    throw { statusCode: 400, message: 'Validation failed', details: parsed.error.flatten() }
  }

  const { data: channel, error } = await supabase
    .from('file_channels')
    .update(parsed.data)
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select(CHANNEL_SELECT_QUERY)
    .single()

  if (error || !channel) {
    throw { statusCode: 404, message: 'Channel not found or access denied' }
  }

  return successResponse({ channel })
}

async function handleDeleteChannel(id: string, user: any, profile: any, supabase: any) {
  if (!isAdminOrManagerRole(profile.role)) {
    throw { statusCode: 403, message: 'Admin or manager access required' }
  }

  // Get channel first for logging
  const { data: channel, error: fetchError } = await supabase
    .from('file_channels')
    .select('id, name, client_org_id')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single()

  if (fetchError || !channel) {
    throw { statusCode: 404, message: 'Channel not found or access denied' }
  }

  // Get all files in this channel to delete from storage
  const { data: channelFiles } = await supabase
    .from('files')
    .select('id, storage_path')
    .eq('channel_id', id)

  // Delete files from storage
  if (channelFiles && channelFiles.length > 0) {
    const storagePaths = channelFiles.map((f: any) => f.storage_path)
    await supabase.storage.from('files').remove(storagePaths)

    // Delete file records
    await supabase
      .from('files')
      .delete()
      .eq('channel_id', id)
  }

  // Delete channel (CASCADE handles channel_folders)
  const { error } = await supabase
    .from('file_channels')
    .delete()
    .eq('id', id)

  if (error) {
    throw { statusCode: 500, message: 'Failed to delete channel', details: error.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    org_id: profile.org_id,
    user_id: user.id,
    action: 'channel_deleted',
    entity_type: 'file_channel',
    entity_id: id,
    metadata: { channel_name: channel.name },
  })

  return successResponse({ message: 'Channel deleted successfully' })
}
