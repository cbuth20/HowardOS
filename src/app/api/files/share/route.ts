import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const { fileId, userIds, permission = 'view' } = await request.json()

    if (!fileId || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'fileId and userIds array required' },
        { status: 400 }
      )
    }

    // Verify file exists and belongs to admin's org
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('id, org_id, name')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (file.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Remove existing permissions for this file
    await supabase
      .from('file_permissions')
      .delete()
      .eq('file_id', fileId)

    // Create new permissions
    const permissions = userIds.map(userId => ({
      file_id: fileId,
      user_id: userId,
      permission,
    }))

    const { error: insertError } = await supabase
      .from('file_permissions')
      .insert(permissions)

    if (insertError) {
      console.error('Insert permissions error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create permissions', details: insertError.message },
        { status: 500 }
      )
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

    return NextResponse.json({
      success: true,
      message: `File shared with ${userIds.length} user(s)`,
    })
  } catch (error) {
    console.error('Share error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get users file is shared with
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'fileId required' }, { status: 400 })
    }

    // Get file permissions with user details
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
      console.error('Get permissions error:', error)
      return NextResponse.json(
        { error: 'Failed to get permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      permissions: permissions || [],
    })
  } catch (error) {
    console.error('Get share error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
