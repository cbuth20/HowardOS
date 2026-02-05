import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { Readable } from 'stream'
import busboy from 'busboy'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Profile not found' }),
      }
    }

    // Parse multipart form data
    const contentType = event.headers['content-type'] || event.headers['Content-Type']
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      }
    }

    // Note: In Netlify Functions, handling file uploads requires base64 encoding
    // For production, consider using Supabase Storage's signed upload URLs
    // This is a simplified implementation

    const body = event.isBase64Encoded
      ? Buffer.from(event.body!, 'base64')
      : Buffer.from(event.body!, 'utf-8')

    return new Promise((resolve) => {
      let fileBuffer: Buffer | null = null
      let fileName = ''
      let mimeType = ''
      let folderPath = '/'
      let description: string | null = null

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
      })

      bb.on('finish', async () => {
        if (!fileBuffer || !fileName) {
          resolve({
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No file provided' }),
          })
          return
        }

        // Validate file size (50MB)
        const maxSize = 50 * 1024 * 1024
        if (fileBuffer.length > maxSize) {
          resolve({
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'File size exceeds 50MB limit' }),
          })
          return
        }

        // Generate storage path
        const fileId = crypto.randomUUID()
        const fileExtension = fileName.split('.').pop()
        const storagePath = `${profile.org_id}${folderPath}${fileId}.${fileExtension}`

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
            headers,
            body: JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }),
          })
          return
        }

        // Create database record
        const { data: fileRecord, error: dbError } = await supabase
          .from('files')
          .insert({
            id: fileId,
            org_id: profile.org_id,
            name: fileName,
            size: fileBuffer.length,
            mime_type: mimeType,
            storage_path: storagePath,
            folder_path: folderPath,
            uploaded_by: user.id,
            description,
          })
          .select()
          .single()

        if (dbError) {
          await supabase.storage.from('files').remove([storagePath])
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to create file record', details: dbError.message }),
          })
          return
        }

        // Log activity
        await supabase.from('activity_log').insert({
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
          headers,
          body: JSON.stringify({
            success: true,
            file: fileRecord,
            message: 'File uploaded successfully',
          }),
        })
      })

      bb.write(body)
      bb.end()
    })
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    }
  }
}
