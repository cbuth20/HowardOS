'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface TestAccount {
  id: string
  email: string
  full_name: string
  role: string
  organization: string
}

export default function DevSwitchPage() {
  const [accounts, setAccounts] = useState<TestAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTestAccounts()
  }, [])

  const fetchTestAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          organizations (name)
        `)
        .order('email')

      if (error) throw error

      const formatted = (data || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        organization: profile.organizations?.name || 'Unknown',
      }))

      setAccounts(formatted)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickSwitch = async (userId: string, email: string) => {
    if (process.env.NODE_ENV === 'production') {
      alert('This feature is only available in development')
      return
    }

    setSwitching(userId)
    try {
      // For dev testing: Use password auth with a dev password
      const devPassword = 'password'

      // Try to sign in with dev password
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: devPassword,
      })

      if (error) {
        // If fails, show instructions
        alert(`To use quick switch:\n\n1. Sign up this account with password: ${devPassword}\n2. Or use password reset to set this password\n\nEmail: ${email}\nPassword: ${devPassword}`)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setSwitching(null)
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-state-error">Dev only</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-subtle p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-DEFAULT rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-semibold text-brand-navy mb-4">
            🔧 Quick User Switcher
          </h1>

          <div className="mb-6 p-4 bg-state-info-light rounded-lg">
            <p className="text-sm font-medium mb-2">Setup Instructions:</p>
            <ol className="text-sm space-y-1 list-decimal list-inside text-text-muted">
              <li>Sign up each test account at /login with password: <code className="bg-neutral-cream px-2 py-0.5 rounded">DevTest123!</code></li>
              <li>Then you can instantly switch between accounts here</li>
            </ol>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-background-subtle border border-neutral-border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-text-primary">
                        {account.full_name || account.email}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          account.role === 'admin'
                            ? 'bg-brand-primary/20 text-brand-navy'
                            : 'bg-brand-slate/20 text-brand-slate'
                        }`}
                      >
                        {account.role}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">{account.email}</p>
                    <p className="text-xs text-text-muted">{account.organization}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => quickSwitch(account.id, account.email)}
                    disabled={switching === account.id}
                  >
                    {switching === account.id ? 'Switching...' : 'Switch'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
