import { Link, useLocation, useNavigate } from 'react-router'

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
  ChevronRight,
  Loader2,
  User,
  Building2,
  X,
  ClipboardList,
  Wrench,
  ArrowLeftRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { HowardLogo } from '@/components/ui/howard-logo'
import { HowardAvatar } from '@/components/ui/howard-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { UserOrgInfo } from './DashboardLayoutClient'

interface SidebarProps {
  userRole?: string
  orgName?: string
  userName?: string
  userEmail?: string
  userAvatar?: string | null
  userOrgs?: UserOrgInfo[]
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

export function Sidebar({ userRole = 'client', orgName, userName, userEmail, userAvatar, userOrgs = [], isOpen = true, onClose }: SidebarProps) {
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()
  const supabase = createClient()

  const [showClientSwitcher, setShowClientSwitcher] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const DEV_PASSWORD = 'password'

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
    if (import.meta.env.PROD) {
      toast.error('Client switching is only available in development')
      return
    }

    // Get the first client from this organization
    const firstClient = org.clients?.[0]
    if (!firstClient) {
      toast.error('No active clients found in this organization')
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
        toast.error(`Failed to switch. Make sure this account uses password: ${DEV_PASSWORD}`)
        return
      }

      // Success - redirect to dashboard
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSwitching(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }


  interface NavItem {
    label: string
    href: string
    icon: typeof LayoutDashboard
    roles: string[]
    children?: NavItem[]
  }

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'manager', 'user', 'client'],
    },
    {
      label: 'Files',
      href: '/files',
      icon: FolderOpen,
      roles: ['admin', 'manager', 'user', 'client'],
    },
    {
      label: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      roles: ['admin', 'manager', 'user', 'client'],
    },
    {
      label: 'Workstreams',
      href: '/workstreams',
      icon: ClipboardList,
      roles: ['admin', 'manager', 'user', 'client'],
    },
    {
      label: 'Tools',
      href: '/tools/transactions',
      icon: Wrench,
      roles: ['admin'],
      children: [
        {
          label: 'Transactions',
          href: '/tools/transactions',
          icon: ArrowLeftRight,
          roles: ['admin'],
        },
      ],
    },
    {
      label: 'Clients',
      href: '/clients/organizations',
      icon: Users,
      roles: ['admin', 'manager', 'client', 'client_no_access'],
      children: [
        {
          label: 'Organizations',
          href: '/clients/organizations',
          icon: Building2,
          roles: ['admin', 'manager', 'client', 'client_no_access'],
        },
        {
          label: 'Users',
          href: '/clients/users',
          icon: Users,
          roles: ['admin', 'manager', 'client', 'client_no_access'],
        },
      ],
    },
  ]

  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(userRole)
  )

  // Auto-expand sub-nav when on matching paths
  const [expandedNav, setExpandedNav] = useState<string | null>(
    pathname?.startsWith('/clients') ? 'Clients'
    : pathname?.startsWith('/tools') ? 'Tools'
    : null
  )

  // Keep expanded state in sync with pathname
  useEffect(() => {
    if (pathname?.startsWith('/clients')) {
      setExpandedNav('Clients')
    } else if (pathname?.startsWith('/tools')) {
      setExpandedNav('Tools')
    }
  }, [pathname])

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
          w-64 bg-background border-r border-border flex flex-col h-screen
          fixed md:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      {/* Mobile Close Button */}
      {onClose && (
        <div className="md:hidden p-4 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-foreground/80" />
          </Button>
        </div>
      )}

      {/* User Profile Dropdown */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full flex items-center gap-3 p-3 bg-howard-evergreen rounded-lg shadow-sm hover:shadow-md hover:bg-howard-ink/90 transition-all"
            >
              <HowardAvatar
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
              <ChevronDown className="w-4 h-4 text-white/70 transition-transform" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-foreground/80" />
                <span className="text-sm text-foreground">Account Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Org Switcher for multi-org users */}
      {userOrgs.length > 1 && (
        <div className="px-4 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-secondary rounded-md hover:bg-secondary/80 transition-colors text-left">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{orgName || 'Select Org'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
              {userOrgs.map((org) => (
                <DropdownMenuItem
                  key={org.orgId}
                  className="flex items-center gap-2"
                  disabled={org.orgName === orgName}
                >
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className={org.orgName === orgName ? 'font-medium' : ''}>{org.orgName}</span>
                  {org.isPrimary && (
                    <span className="text-[10px] text-muted-foreground ml-auto">Primary</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const hasChildren = item.children && item.children.length > 0
            const isExpanded = expandedNav === item.label
            const parentBasePath = item.children ? item.href.split('/').slice(0, 2).join('/') : null
            const isParentActive = parentBasePath ? pathname?.startsWith(parentBasePath) : false
            const isActive = hasChildren
              ? isParentActive
              : pathname === item.href || pathname?.startsWith(item.href + '/')

            const filteredChildren = item.children?.filter(child =>
              child.roles.includes(userRole)
            )

            return (
              <li key={item.label}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => setExpandedNav(isExpanded ? null : item.label)}
                      className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                        isActive
                          ? 'bg-primary/15 text-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-primary before:rounded-r'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {isExpanded && filteredChildren && (
                      <ul className="ml-4 mt-1 space-y-1">
                        {filteredChildren.map((child) => {
                          const ChildIcon = child.icon
                          const isChildActive = pathname === child.href
                          return (
                            <li key={child.href}>
                              <Link
                                to={child.href}
                                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-md transition-all text-sm ${
                                  isChildActive
                                    ? 'bg-primary/15 text-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-primary before:rounded-r'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                              >
                                <ChildIcon className="w-4 h-4" />
                                <span>{child.label}</span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.href}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                      isActive
                        ? 'bg-primary/15 text-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-primary before:rounded-r'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Dev Tools section */}
      <div className="p-4 border-t border-border">
        {/* Client Switcher (Admin Only, Dev Mode) */}
        {['admin', 'manager'].includes(userRole) && !import.meta.env.PROD && (
          <div>
            <button
              onClick={() => setShowClientSwitcher(!showClientSwitcher)}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full"
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
              <div className="mt-2 bg-secondary border border-border rounded-md p-2 max-h-64 overflow-y-auto shadow-sm">
                {loadingOrgs ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : organizations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No organizations with active clients found
                  </p>
                ) : (
                  <div className="space-y-1">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleSwitchToOrg(org)}
                        disabled={switching !== null}
                        className="w-full text-left px-3 py-2 rounded text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0">
                          {org.logo_url ? (
                            <img
                              src={org.logo_url}
                              alt={org.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {org.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {org.clients?.length || 0} client{org.clients?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {switching === org.id && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
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
