import { useState, useEffect } from 'react'
import { createClient } from '@howard/ui/lib/supabase/client'
import { useNavigate } from 'react-router'
import { Button } from '@howard/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@howard/ui/components/ui/card'
import { Badge } from '@howard/ui/components/ui/badge'
import { HowardAvatar } from '@howard/ui/components/ui/howard-avatar'
import { LogIn, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
  const navigate = useNavigate()
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
        toast.error(`Login failed. Make sure this account uses password: ${DEV_PASSWORD}`)
        return
      }

      // Success - redirect to dashboard
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoggingIn(null)
    }
  }

  if (import.meta.env.PROD) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">This page is only available in development mode.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-serif italic text-foreground">
              Quick Login
            </CardTitle>
            <CardDescription>
              One-click login for test accounts
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-secondary border-l-4 border-primary rounded">
              <p className="text-sm font-medium text-foreground mb-1">
                Development Tool
              </p>
              <p className="text-sm text-muted-foreground">
                All accounts use password: <code className="bg-card px-2 py-0.5 rounded font-mono text-xs">{DEV_PASSWORD}</code>
              </p>
            </div>

            {/* Accounts List */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground mt-4">Loading accounts...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No accounts found</p>
                <p className="text-sm text-muted-foreground">
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
                    className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary hover:bg-secondary hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <HowardAvatar
                        name={account.full_name}
                        email={account.email}
                        role={account.role}
                        size="lg"
                      />

                      {/* Account Info */}
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">
                            {account.full_name}
                          </p>
                          <Badge
                            variant={['admin', 'manager'].includes(account.role) ? 'default' : 'secondary'}
                          >
                            {account.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{account.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{account.organization}</p>
                      </div>
                    </div>

                    {/* Login Button */}
                    <div className="flex items-center gap-2">
                      {loggingIn === account.email ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <LogIn className="w-5 h-5 text-primary group-hover:text-foreground transition-colors" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Setup Instructions */}
            <div className="mt-8 pt-8 border-t border-border">
              <details className="cursor-pointer">
                <summary className="font-semibold text-foreground mb-4 hover:text-primary transition-colors">
                  Setup Instructions
                </summary>
                <div className="space-y-4 text-sm text-muted-foreground mt-4">
                  <div>
                    <p className="font-medium text-foreground mb-2">1. Create Test Accounts</p>
                    <p>In Supabase Dashboard &rarr; Authentication &rarr; Users, create accounts with password: <code className="bg-secondary px-2 py-0.5 rounded font-mono">{DEV_PASSWORD}</code></p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-2">2. Run Migrations</p>
                    <p>Execute <code className="bg-secondary px-2 py-0.5 rounded font-mono">004_test_clients_setup.sql</code> to create client organizations</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-2">3. Link Profiles</p>
                    <p>Run UPDATE queries to link user profiles to their organizations</p>
                  </div>
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
