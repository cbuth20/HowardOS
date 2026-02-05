'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { HowardLogo } from '@/components/ui/HowardLogo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const [authMode, setAuthMode] = useState<'magic-link' | 'password'>('magic-link')

  const router = useRouter()
  const supabase = createClient()

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Check your email for the login link!',
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred',
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-subtle">
      <div className="w-full max-w-md">
        <div className="bg-background-card rounded-lg shadow-xl border border-neutral-border p-8">
          {/* Logo/Header */}
          <div className="flex flex-col items-center mb-8">
            <HowardLogo variant="full" showText={false} className="mb-4" />
            <h1 className="text-2xl font-bold font-serif text-brand-navy">HowardOS</h1>
            <p className="text-text-muted mt-2">Sign in to your account</p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                message.type === 'error'
                  ? 'bg-state-error/10 text-state-error'
                  : 'bg-state-success/10 text-state-success'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Auth Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={authMode === 'magic-link' ? 'primary' : 'secondary'}
              onClick={() => setAuthMode('magic-link')}
              className="flex-1"
            >
              Magic Link
            </Button>
            <Button
              variant={authMode === 'password' ? 'primary' : 'secondary'}
              onClick={() => setAuthMode('password')}
              className="flex-1"
            >
              Password
            </Button>
          </div>

          {/* Login Form */}
          <form onSubmit={authMode === 'magic-link' ? handleMagicLinkLogin : handlePasswordLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>

              {authMode === 'password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full"
              >
                {loading
                  ? 'Loading...'
                  : authMode === 'magic-link'
                  ? 'Send Magic Link'
                  : 'Sign In'}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background-card text-text-muted">Or continue with</span>
            </div>
          </div>

          {/* Google OAuth */}
          <Button
            onClick={handleGoogleLogin}
            variant="secondary"
            disabled={loading}
            className="w-full"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  )
}
