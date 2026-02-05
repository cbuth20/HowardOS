'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  UserCog,
  ChevronDown,
  ChevronUp,
  Loader2,
  User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { HowardLogo } from '@/components/ui/HowardLogo'
import { Avatar } from '@/components/ui/Avatar'

interface SidebarProps {
  userRole?: 'admin' | 'client'
  orgName?: string
  userName?: string
  userEmail?: string
  userAvatar?: string | null
}

interface ClientUser {
  id: string
  email: string
  full_name: string
  role: string
  org_id: string
  organizations?: {
    id: string
    name: string
    slug: string
  }
}

export function Sidebar({ userRole = 'client', orgName, userName, userEmail, userAvatar }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showClientSwitcher, setShowClientSwitcher] = useState(false)
  const [clients, setClients] = useState<ClientUser[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const DEV_PASSWORD = 'password'

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  useEffect(() => {
    if (showClientSwitcher && clients.length === 0) {
      fetchClients()
    }
  }, [showClientSwitcher])

  const fetchClients = async () => {
    setLoadingClients(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          org_id,
          organizations (
            id,
            name,
            slug
          )
        `)
        .eq('role', 'client')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  const handleSwitchToClient = async (clientEmail: string, clientId: string) => {
    if (process.env.NODE_ENV === 'production') {
      alert('Client switching is only available in development')
      return
    }

    setSwitching(clientId)
    try {
      // Sign out current user
      await supabase.auth.signOut()

      // Sign in as the client
      const { error } = await supabase.auth.signInWithPassword({
        email: clientEmail,
        password: DEV_PASSWORD,
      })

      if (error) {
        alert(`Failed to switch to client.\n\nMake sure this account was created with password: ${DEV_PASSWORD}\n\nError: ${error.message}`)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setSwitching(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Group clients by organization
  const clientsByOrg = clients.reduce((acc, client) => {
    const orgName = client.organizations?.name || 'Unknown Organization'
    if (!acc[orgName]) {
      acc[orgName] = []
    }
    acc[orgName].push(client)
    return acc
  }, {} as Record<string, ClientUser[]>)

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'client'],
    },
    {
      label: 'Files',
      href: '/files',
      icon: FolderOpen,
      roles: ['admin', 'client'],
    },
    {
      label: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      roles: ['admin', 'client'],
    },
  ]

  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(userRole)
  )

  return (
    <aside className="w-64 bg-background-subtle border-r border-neutral-border flex flex-col h-screen">
      {/* User Profile Dropdown */}
      <div className="p-4">
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 p-3 bg-brand-navy rounded-lg shadow-sm hover:shadow-md hover:bg-brand-navy/90 transition-all"
          >
            <Avatar
              name={userName || userEmail || 'User'}
              email={userEmail}
              role={userRole}
              src={userAvatar || undefined}
              size="md"
            />
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {userName || userEmail}
              </p>
              <p className="text-xs text-white/70 truncate">{orgName}</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-white/70 transition-transform ${
                showUserMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-background-card rounded-lg shadow-xl border border-neutral-border py-2 z-50"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-background-hover transition-colors"
              >
                <Settings className="w-4 h-4 text-text-secondary" />
                <span className="text-sm text-text-primary">Account Settings</span>
              </Link>

              {userRole === 'admin' && (
                <>
                  <div className="my-2 border-t border-neutral-border"></div>
                  <div className="px-4 py-1">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Admin
                    </p>
                  </div>
                  <Link
                    href="/users"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-background-hover transition-colors"
                  >
                    <Users className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-primary">Users</span>
                  </Link>
                </>
              )}

              <div className="my-2 border-t border-neutral-border"></div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-background-hover transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-state-error" />
                <span className="text-sm text-state-error">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                    isActive
                      ? 'bg-brand-primary/10 text-brand-navy font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-brand-primary before:rounded-r'
                      : 'text-text-secondary hover:bg-neutral-gray-100 hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Dev Tools section */}
      <div className="p-4 border-t border-neutral-border">
        {/* Client Switcher (Admin Only, Dev Mode) */}
        {userRole === 'admin' && process.env.NODE_ENV !== 'production' && (
          <div>
            <button
              onClick={() => setShowClientSwitcher(!showClientSwitcher)}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-md text-text-secondary hover:bg-neutral-gray-100 hover:text-text-primary transition-colors w-full"
            >
              <div className="flex items-center gap-3">
                <UserCog className="w-5 h-5" />
                <span className="text-sm">Switch to Client</span>
              </div>
              {showClientSwitcher ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Dropdown with clients */}
            {showClientSwitcher && (
              <div className="mt-2 bg-background-elevated border border-neutral-border rounded-md p-2 max-h-64 overflow-y-auto shadow-sm">
                {loadingClients ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                  </div>
                ) : clients.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">
                    No client accounts found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(clientsByOrg).map(([orgName, orgClients]) => (
                      <div key={orgName}>
                        <p className="text-xs font-medium text-text-muted mb-1 px-2">
                          {orgName}
                        </p>
                        <div className="space-y-1">
                          {orgClients.map((client) => (
                            <button
                              key={client.id}
                              onClick={() => handleSwitchToClient(client.email, client.id)}
                              disabled={switching !== null}
                              className="w-full text-left px-3 py-2 rounded text-sm text-text-primary hover:bg-neutral-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <Avatar
                                name={client.full_name || client.email}
                                email={client.email}
                                role={client.role as 'admin' | 'client'}
                                size="sm"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {client.full_name || client.email}
                                </p>
                                <p className="text-xs text-text-muted truncate">
                                  {client.email}
                                </p>
                              </div>
                              {switching === client.id && (
                                <Loader2 className="w-4 h-4 animate-spin text-brand-primary flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </aside>
  )
}
