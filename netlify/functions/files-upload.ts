import { HandlerEvent, HandlerResponse } from '@netlify/functions'
import { withMiddleware, AuthContext } from './lib/middleware'
import busboy from 'busboy'

export const handler = withMiddleware(async (event: HandlerEvent, { user, profile, supabase }: AuthContext): Promise<HandlerResponse> => {
  // Parse multipart form data
  const contentType = event.headers['content-type'] || event.headers['Content-Type']
  if (!contentType || !contentType.includes('multipart/form-data')) {
    throw { statusCode: 400, message: 'Content-Type must be multipart/form-data' }
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body!, 'base64')
    : Buffer.from(event.body!, 'utf-8')

  return new Promise((resolve) => {
    let fileBuffer: Buffer | null = null
    let fileName = ''
    let mimeType = ''
    let folderPath = '/'
    let description: string | null = null
    let channelId: string | null = null

    const bb = busboy({ headers: { 'content-type': contentType } })

    bb.on('file', (name, file, info) => {
      fileName = info.filename
      mimeType = info.mimeType
      const chunks: Buffer[] = []

      file.on('data', (data) => {
        chunks.push(data)
      })

      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks)
      })
    })

    bb.on('field', (name, val) => {
      if (name === 'folderPath') folderPath = val || '/'
      if (name === 'description') description = val || null
      if (name === 'channelId') channelId = val || null
    })

    bb.on('finish', async () => {
      if (!fileBuffer || !fileName) {
        resolve({
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'No file provided' }),
        })
        return
      }

      // Validate file size (50MB)
      const maxSize = 50 * 1024 * 1024
      if (fileBuffer.length > maxSize) {
        resolve({
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'File size exceeds 50MB limit' }),
        })
        return
      }

      try {
        // Generate storage path
        const fileId = crypto.randomUUID()
        const fileExtension = fileName.split('.').pop()
        const storagePath = channelId
          ? `${profile.org_id}/channels/${channelId}${folderPath}${fileId}.${fileExtension}`
          : `${profile.org_id}${folderPath}${fileId}.${fileExtension}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(storagePath, fileBuffer, {
            contentType: mimeType,
            upsert: false,
          })

        if (uploadError) {
          resolve({
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Failed to upload file', details: uploadError.message }),
          })
          return
        }

        // Create database record
        const fileInsert: any = {
          id: fileId,
          org_id: profile.org_id,
          name: fileName,
          size: fileBuffer.length,
          mime_type: mimeType,
          storage_path: storagePath,
          folder_path: folderPath,
          uploaded_by: user.id,
          description,
        }
        if (channelId) {
          fileInsert.channel_id = channelId
        }

        const { data: fileRecord, error: dbError } = await (supabase as any)
          .from('files')
          .insert(fileInsert)
          .select()
          .single()

        if (dbError) {
          await supabase.storage.from('files').remove([storagePath])
          resolve({
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Failed to create file record', details: dbError.message }),
          })
          return
        }

        // Log activity
        await (supabase as any).from('activity_log').insert({
          org_id: profile.org_id,
          user_id: user.id,
          action: 'file_uploaded',
          entity_type: 'file',
          entity_id: fileId,
          metadata: {
            file_name: fileName,
            file_size: fileBuffer.length,
            folder_path: folderPath,
          },
        })

        resolve({
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: {
              file: fileRecord,
              message: 'File uploaded successfully',
            },
          }),
        })
      } catch (error: any) {
        resolve({
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Internal server error', message: error.message }),
        })
      }
    })

    bb.write(body)
    bb.end()
  })
}, { requireAuth: true })
