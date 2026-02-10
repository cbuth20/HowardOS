'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { HowardLogo } from '@/components/ui/HowardLogo'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function SetPasswordPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Not authenticated, redirect to login
        router.push('/login')
        return
      }

      // Get user profile to check if already active
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, is_active')
        .eq('id', user.id)
        .single() as { data: { email: string; is_active: boolean } | null }

      if (profile?.is_active) {
        // Already active, redirect to dashboard
        router.push('/dashboard')
        return
      }

      setEmail(profile?.email || user.email || '')
      setLoading(false)
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validate passwords
    if (password.length < 8) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 8 characters',
      })
      return
    }

    if (password !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match',
      })
      return
    }

    setSubmitting(true)

    try {
      // Update user password in Supabase auth
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      })

      if (passwordError) throw passwordError

      // Mark user as active in profiles
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', user.id)

      if (profileError) throw profileError

      setMessage({
        type: 'success',
        text: 'Account activated! Redirecting...',
      })

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1000)
    } catch (error: any) {
      console.error('Password setup error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to set password. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-subtle">
      <div className="w-full max-w-md">
        <div className="bg-background-card rounded-lg shadow-xl border border-neutral-border p-8">
          {/* Logo/Header */}
          <div className="flex flex-col items-center mb-8">
            <HowardLogo variant="full" showText={false} className="mb-4" />
            <h1 className="text-2xl font-bold text-brand-navy">Activate your account</h1>
            <p className="text-text-muted mt-2 text-center">
              Set a password to complete your account setup
            </p>
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

          {/* Setup Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email (read-only) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-background-elevated"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Set a password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={submitting}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    disabled={submitting}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="secondary"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Activating account...
                  </>
                ) : (
                  'Activate account'
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-text-muted">
              By activating your account, you agree to our{' '}
              <a href="#" className="text-brand-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-brand-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>

          <div className="mt-4 text-center">
            <a
              href="/login"
              className="text-sm text-text-muted hover:text-text-primary"
            >
              Already have an account?
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
