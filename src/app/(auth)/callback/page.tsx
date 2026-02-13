'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Auth callback page — handles both flows:
 * - Implicit flow: #access_token from generateLink magic links (invite emails)
 * - PKCE flow: ?code= from normal login/magic link
 *
 * The Supabase client automatically picks up #access_token hash fragments
 * and establishes a session. We then check is_active to route new users
 * to /set-password before they reach the dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle PKCE flow (?code= query param)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Code exchange error:', error)
            router.replace(`/login?error=${encodeURIComponent(error.message)}`)
            return
          }
        }

        // For implicit flow (#access_token), the Supabase client auto-detects
        // the hash fragment and establishes the session via onAuthStateChange.
        // Wait briefly for it to complete.
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          // Session might not be ready yet from hash fragment — listen for it
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              if (event === 'SIGNED_IN' && newSession) {
                subscription.unsubscribe()
                await redirectBasedOnProfile(newSession.user.id)
              }
            }
          )

          // Timeout fallback — if no session after 5s, redirect to login
          setTimeout(() => {
            subscription.unsubscribe()
            router.replace('/login?error=Authentication+timed+out')
          }, 5000)

          return
        }

        // Session exists — route based on profile
        await redirectBasedOnProfile(session.user.id)
      } catch (error) {
        console.error('Auth callback error:', error)
        router.replace('/login?error=Authentication+failed')
      }
    }

    const redirectBasedOnProfile = async (userId: string) => {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_active')
        .eq('id', userId)
        .single() as { data: { is_active: boolean } | null }

      if (profile && !profile.is_active) {
        router.replace('/set-password')
      } else {
        router.replace('/dashboard')
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  )
}
