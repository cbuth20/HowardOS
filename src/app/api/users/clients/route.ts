import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Get all client users (for sharing files)
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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all client users (not from same org - these are the clients we serve)
    const { data: clients, error: clientsError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        org_id,
        organizations (
          id,
          name,
          slug
        )
      `)
      .eq('role', 'client')
      .neq('org_id', profile.org_id) // Clients from OTHER orgs
      .eq('is_active', true)
      .order('full_name')

    if (clientsError) {
      console.error('Get clients error:', clientsError)
      return NextResponse.json(
        { error: 'Failed to get clients', details: clientsError.message },
        { status: 500 }
      )
    }

    // Group by organization
    const clientsByOrg = (clients || []).reduce((acc: any, client: any) => {
      const orgName = client.organizations?.name || 'Unknown'
      if (!acc[orgName]) {
        acc[orgName] = []
      }
      acc[orgName].push({
        id: client.id,
        email: client.email,
        full_name: client.full_name,
        role: client.role,
        org_id: client.org_id,
        org_name: orgName,
      })
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      clients: clients || [],
      clientsByOrg,
    })
  } catch (error) {
    console.error('Get clients error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
