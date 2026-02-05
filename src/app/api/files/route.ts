import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const folderPath = searchParams.get('folderPath') || '/'
    const view = searchParams.get('view') || 'all' // 'all' | 'my-files'

    // For clients, get files that are:
    // 1. Uploaded by them, OR
    // 2. Shared with them via file_permissions
    if (profile.role === 'client') {
      // Get file IDs shared with this user
      const { data: sharedFileIds } = await supabase
        .from('file_permissions')
        .select('file_id')
        .eq('user_id', user.id)

      const sharedIds = sharedFileIds?.map(p => p.file_id) || []

      // Get files uploaded by user OR shared with user
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select(`
          *,
          uploaded_by_profile:profiles!files_uploaded_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .or(`uploaded_by.eq.${user.id}${sharedIds.length > 0 ? `,id.in.(${sharedIds.join(',')})` : ''}`)
        .eq('folder_path', folderPath)
        .order('created_at', { ascending: false })

      if (filesError) {
        console.error('Files query error:', filesError)
        return NextResponse.json(
          { error: 'Failed to fetch files', details: filesError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        files: files || [],
        view: 'client',
        folderPath,
      })
    }

    // For admins, build query based on view
    let query = supabase
      .from('files')
      .select(`
        *,
        uploaded_by_profile:profiles!files_uploaded_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('org_id', profile.org_id)
      .eq('folder_path', folderPath)
      .order('created_at', { ascending: false })

    // Apply view filter for admin
    if (view === 'my-files') {
      query = query.eq('uploaded_by', user.id)
    }

    const { data: files, error: filesError } = await query

    if (filesError) {
      console.error('Files query error:', filesError)
      return NextResponse.json(
        { error: 'Failed to fetch files', details: filesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      files: files || [],
      view,
      folderPath,
    })
  } catch (error) {
    console.error('Fetch files error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get file ID from query
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }

    // Get file record
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check permissions
    const canDelete =
      profile.role === 'admin' || file.uploaded_by === user.id

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([file.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      return NextResponse.json(
        { error: 'Failed to delete file from storage' },
        { status: 500 }
      )
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete file record' },
        { status: 500 }
      )
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

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
