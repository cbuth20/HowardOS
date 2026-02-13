import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth callback route for handling OAuth and magic link redirects.
 * New users (is_active = false) are sent to /set-password first.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    // Check if this is a first-time user who needs to set a password
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_active')
        .eq('id', user.id)
        .single() as { data: { is_active: boolean } | null }

      if (profile && !profile.is_active) {
        return NextResponse.redirect(`${origin}/set-password`)
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}${redirectTo}`)
}
