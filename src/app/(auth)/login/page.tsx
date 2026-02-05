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

  const router = useRouter()
  const supabase = createClient()

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
        text: error.message || 'Invalid email or password',
      })
    } finally {
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
            <h1 className="text-2xl font-bold text-brand-navy">HowardOS</h1>
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

          {/* Login Form */}
          <form onSubmit={handlePasswordLogin}>
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

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          {/* Info Message */}
          <div className="mt-6 p-4 bg-background-elevated rounded-lg border border-neutral-border">
            <p className="text-sm text-text-muted text-center">
              Don't have an account? Contact your administrator to get access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
