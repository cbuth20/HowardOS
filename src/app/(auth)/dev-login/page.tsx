'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { LogIn, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

interface TestAccount {
  id: string
  email: string
  full_name: string
  role: string
  organization: string
}

const DEV_PASSWORD = 'password'

export default function DevLoginPage() {
  const [accounts, setAccounts] = useState<TestAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState<string | null>(null)
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
        .order('role', { ascending: false })
        .order('email')

      if (error) throw error

      const formatted = (data || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name || profile.email,
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

  const handleLogin = async (email: string) => {
    setLoggingIn(email)
    try {
      // Sign out current user first
      await supabase.auth.signOut()

      // Sign in with the test account
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: DEV_PASSWORD,
      })

      if (error) {
        alert(`Login failed!\n\nMake sure this account was created with password: ${DEV_PASSWORD}\n\nError: ${error.message}`)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoggingIn(null)
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-subtle">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-state-error mb-4">Access Denied</h1>
          <p className="text-text-muted">This page is only available in development mode.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-subtle p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-card rounded-lg shadow-lg border border-neutral-border p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-brand-navy mb-2">
              🔧 Quick Login
            </h1>
            <p className="text-text-muted">
              One-click login for test accounts
            </p>
          </div>

          {/* Info Banner */}
          <div className="mb-6 p-4 bg-state-info-light border-l-4 border-brand-primary rounded">
            <p className="text-sm font-medium text-text-primary mb-1">
              Development Tool
            </p>
            <p className="text-sm text-text-muted">
              All accounts use password: <code className="bg-white px-2 py-0.5 rounded font-mono text-xs">{DEV_PASSWORD}</code>
            </p>
          </div>

          {/* Accounts List */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-brand-primary mx-auto" />
              <p className="text-text-muted mt-4">Loading accounts...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-muted mb-4">No accounts found</p>
              <p className="text-sm text-text-muted">
                Create test accounts in Supabase Dashboard first
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleLogin(account.email)}
                  disabled={loggingIn !== null}
                  className="w-full flex items-center justify-between p-4 bg-background-DEFAULT border border-neutral-border rounded-lg hover:border-brand-primary hover:bg-background-hover hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar
                      name={account.full_name}
                      email={account.email}
                      role={account.role as 'admin' | 'client'}
                      size="lg"
                    />

                    {/* Account Info */}
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-text-primary">
                          {account.full_name}
                        </p>
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
                      <p className="text-xs text-text-muted mt-0.5">{account.organization}</p>
                    </div>
                  </div>

                  {/* Login Button */}
                  <div className="flex items-center gap-2">
                    {loggingIn === account.email ? (
                      <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                    ) : (
                      <LogIn className="w-5 h-5 text-brand-primary group-hover:text-brand-navy transition-colors" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Setup Instructions */}
          <div className="mt-8 pt-8 border-t border-neutral-border">
            <details className="cursor-pointer">
              <summary className="font-semibold text-brand-navy mb-4 hover:text-brand-primary transition-colors">
                Setup Instructions
              </summary>
              <div className="space-y-4 text-sm text-text-muted mt-4">
                <div>
                  <p className="font-medium text-text-primary mb-2">1. Create Test Accounts</p>
                  <p>In Supabase Dashboard → Authentication → Users, create accounts with password: <code className="bg-neutral-cream px-2 py-0.5 rounded">{DEV_PASSWORD}</code></p>
                </div>
                <div>
                  <p className="font-medium text-text-primary mb-2">2. Run Migrations</p>
                  <p>Execute <code className="bg-neutral-cream px-2 py-0.5 rounded">004_test_clients_setup.sql</code> to create client organizations</p>
                </div>
                <div>
                  <p className="font-medium text-text-primary mb-2">3. Link Profiles</p>
                  <p>Run UPDATE queries to link user profiles to their organizations</p>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
