import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { createClient } from '@howard/ui/lib/supabase/client'

/**
 * Auth callback page — handles session establishment for:
 * - PKCE flow: ?code= from login
 * - Implicit flow: #access_token hash fragments
 *
 * Redirects to /dashboard on success (onboarding check happens there).
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
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
            navigate(`/login?error=${encodeURIComponent(error.message)}`, { replace: true })
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
                navigate('/dashboard', { replace: true })
              }
            }
          )

          // Timeout fallback — if no session after 5s, redirect to login
          setTimeout(() => {
            subscription.unsubscribe()
            navigate('/login?error=Authentication+timed+out', { replace: true })
          }, 5000)

          return
        }

        // Session exists — go to dashboard
        navigate('/dashboard', { replace: true })
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/login?error=Authentication+failed', { replace: true })
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
