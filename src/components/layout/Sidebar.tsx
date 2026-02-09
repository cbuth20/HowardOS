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
  User,
  Building2,
  X,
  ClipboardList
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
  isOpen?: boolean
  onClose?: () => void
}

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  clients?: Array<{
    id: string
    email: string
    full_name: string | null
    role: string
  }>
}

export function Sidebar({ userRole = 'client', orgName, userName, userEmail, userAvatar, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showClientSwitcher, setShowClientSwitcher] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

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
    if (showClientSwitcher && organizations.length === 0) {
      fetchOrganizations()
    }
  }, [showClientSwitcher])

  const fetchOrganizations = async () => {
    setLoadingOrgs(true)
    try {
      // First get all organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, created_at')
        .order('name')

      if (orgsError) throw orgsError

      // Then get client users for each organization
      const orgsWithClients = await Promise.all(
        (orgsData || []).map(async (org: any) => {
          const { data: clientsData } = await supabase
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('org_id', org.id)
            .eq('role', 'client')
            .eq('is_active', true)
            .order('full_name')

          return {
            ...org,
            clients: clientsData || []
          }
        })
      )

      // Filter out organizations with no active clients
      const orgsWithActiveClients = orgsWithClients.filter(org => org.clients && org.clients.length > 0)
      setOrganizations(orgsWithActiveClients)
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoadingOrgs(false)
    }
  }

  const handleSwitchToOrg = async (org: Organization) => {
    if (process.env.NODE_ENV === 'production') {
      alert('Client switching is only available in development')
      return
    }

    // Get the first client from this organization
    const firstClient = org.clients?.[0]
    if (!firstClient) {
      alert('No active clients found in this organization')
      return
    }

    setSwitching(org.id)
    try {
      // Sign out current user
      await supabase.auth.signOut()

      // Sign in as the first client
      const { error } = await supabase.auth.signInWithPassword({
        email: firstClient.email,
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
    {
      label: 'Workstreams',
      href: '/workstreams',
      icon: ClipboardList,
      roles: ['admin', 'client'],
    },
    {
      label: 'Clients',
      href: '/clients',
      icon: Users,
      roles: ['admin'],
    },
  ]

  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(userRole)
  )

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (window.innerWidth < 768 && isOpen && onClose) {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 768 && onClose) {
      onClose()
    }
  }, [pathname, onClose])

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          w-64 bg-background-subtle border-r border-neutral-border flex flex-col h-screen
          fixed md:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      {/* Mobile Close Button */}
      {onClose && (
        <div className="md:hidden p-4 flex justify-end">
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-gray-100 rounded-md transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
      )}

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

            {/* Dropdown with organizations */}
            {showClientSwitcher && (
              <div className="mt-2 bg-background-elevated border border-neutral-border rounded-md p-2 max-h-64 overflow-y-auto shadow-sm">
                {loadingOrgs ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                  </div>
                ) : organizations.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">
                    No organizations with active clients found
                  </p>
                ) : (
                  <div className="space-y-1">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleSwitchToOrg(org)}
                        disabled={switching !== null}
                        className="w-full text-left px-3 py-2 rounded text-sm text-text-primary hover:bg-neutral-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-gray-100 flex items-center justify-center flex-shrink-0">
                          {org.logo_url ? (
                            <img
                              src={org.logo_url}
                              alt={org.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-4 h-4 text-text-muted" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {org.name}
                          </p>
                          <p className="text-xs text-text-muted truncate">
                            {org.clients?.length || 0} client{org.clients?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {switching === org.id && (
                          <Loader2 className="w-4 h-4 animate-spin text-brand-primary flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </aside>
    </>
  )
}
