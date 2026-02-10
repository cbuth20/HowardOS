import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful authentication - check if user needs to set password
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if user is active (has set password)
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', user.id)
          .single() as { data: { is_active: boolean } | null }

        // If user is not active, redirect to set password page
        if (profile && !profile.is_active) {
          return NextResponse.redirect(new URL('/set-password', requestUrl.origin))
        }
      }

      // User is active, redirect to dashboard or specified page
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }

    // If there was an error, redirect to login with error message
    console.error('Auth callback error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    )
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
