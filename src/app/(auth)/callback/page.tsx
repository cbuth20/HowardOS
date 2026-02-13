'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Auth callback page — handles session establishment for:
 * - PKCE flow: ?code= from login
 * - Implicit flow: #access_token hash fragments
 *
 * Redirects to /dashboard on success (onboarding check happens there).
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
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          // Session might not be ready yet from hash fragment — listen for it
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              if (event === 'SIGNED_IN' && newSession) {
                subscription.unsubscribe()
                router.replace('/dashboard')
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

        // Session exists — go to dashboard
        router.replace('/dashboard')
      } catch (error) {
        console.error('Auth callback error:', error)
        router.replace('/login?error=Authentication+failed')
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
