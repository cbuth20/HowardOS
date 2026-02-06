import { HandlerEvent } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import { successResponse } from './lib/responses'

const FILE_SELECT_QUERY = `
  *,
  uploaded_by_profile:profiles!files_uploaded_by_fkey(
    id,
    full_name,
    email
  )
`

export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, supabase }: AuthContext) => {
  const method = event.httpMethod

  if (method === 'GET') {
    return handleGetFiles(event, user, profile, supabase)
  }
  if (method === 'DELETE') {
    return handleDeleteFile(event, user, profile, supabase)
  }

  throw { statusCode: 405, message: 'Method not allowed' }
}, { requireAuth: true })

async function handleGetFiles(event: HandlerEvent, user: any, profile: any, supabase: any) {
  const params = event.queryStringParameters || {}
  const folderPath = params.folderPath || '/'
  const view = params.view || 'all'

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

  // For admins
  let query = supabase
    .from('files')
    .select(FILE_SELECT_QUERY)
    .eq('org_id', profile.org_id)
    .eq('folder_path', folderPath)
    .order('created_at', { ascending: false })

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

  // Check permissions
  const canDelete = profile.role === 'admin' || file.uploaded_by === user.id

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

  // Log activity (note: using activity_log table name as per existing code, will fix in migration)
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
