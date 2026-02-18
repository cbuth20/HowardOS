import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

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
    if (import.meta.env.PROD) {
      toast.error('This feature is only available in development')
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
        toast.error(`Login failed. Make sure this account uses password: ${devPassword}`)
      } else {
        navigate('/dashboard')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSwitching(null)
    }
  }

  if (import.meta.env.PROD) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Dev only</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-serif italic text-foreground">
              Quick User Switcher
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="mb-6 p-4 bg-secondary rounded-lg">
              <p className="text-sm font-medium mb-2">Setup Instructions:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Sign up each test account at /login with password: <code className="bg-secondary px-2 py-0.5 rounded font-mono">DevTest123!</code></li>
                <li>Then you can instantly switch between accounts here</li>
              </ol>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 bg-background border border-border rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">
                          {account.full_name || account.email}
                        </span>
                        <Badge
                          variant={['admin', 'manager'].includes(account.role) ? 'default' : 'secondary'}
                        >
                          {account.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{account.email}</p>
                      <p className="text-xs text-muted-foreground">{account.organization}</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
