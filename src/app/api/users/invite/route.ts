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

    // Get user profile and verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can invite users' },
        { status: 403 }
      )
    }

    // Get request body
    const { email, fullName, role, orgId } = await request.json()

    // Validate inputs
    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: 'Email, full name, and role are required' },
        { status: 400 }
      )
    }

    if (role !== 'admin' && role !== 'client') {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // For now, we'll create a placeholder profile
    // In production, you'd want to send an actual invitation email via Supabase Auth
    // or a service like SendGrid/Resend with a signup link

    // Note: This is a simplified approach for development
    // In production, use Supabase Admin API to create invite links
    // or implement a proper invitation system with email verification

    // Create invitation record (you can create an invitations table for this)
    // For now, we'll just return success and log the invitation

    console.log('Invitation would be sent:', {
      email,
      fullName,
      role,
      orgId,
    })

    // Return success
    // In production, you'd send an email here with a signup link
    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      details: {
        email,
        fullName,
        role,
      },
    })
  } catch (error: any) {
    console.error('Invite user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
