import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Disable body parser for this route - handle raw body
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse form data with error handling
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (parseError) {
      console.error('FormData parse error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse form data', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File | null
    const folderPath = (formData.get('folderPath') as string) || '/'
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Generate unique file ID and storage path
    const fileId = crypto.randomUUID()
    const fileExtension = file.name.split('.').pop()
    const storagePath = `${profile.org_id}${folderPath}${fileId}.${fileExtension}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Create file record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        org_id: profile.org_id,
        name: file.name,
        size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        folder_path: folderPath,
        uploaded_by: user.id,
        description: description || null,
      })
      .select()
      .single()

    if (dbError) {
      // Clean up storage if database insert fails
      await supabase.storage.from('files').remove([storagePath])
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create file record', details: dbError.message },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_log').insert({
      org_id: profile.org_id,
      user_id: user.id,
      action: 'file_uploaded',
      entity_type: 'file',
      entity_id: fileId,
      metadata: {
        file_name: file.name,
        file_size: file.size,
        folder_path: folderPath,
      },
    })

    return NextResponse.json({
      success: true,
      file: fileRecord,
      message: 'File uploaded successfully',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
