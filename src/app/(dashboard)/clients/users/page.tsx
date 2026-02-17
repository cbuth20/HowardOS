'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UsersDataTable } from '@/components/clients/UsersDataTable'
import { InviteUserModal } from '@/components/users/InviteUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAllowedInviteRoles } from '@/lib/auth/permissions'
import { authFetch } from '@/lib/utils/auth-fetch'
import { Users, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Organization {
  id: string
  name: string
  slug: string
}

interface UserOrg {
  org_id: string
  name: string
  is_primary: boolean
}

interface OrgUser {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  avatar_url: string | null
  dashboard_iframe_url: string | null
  created_at: string
  org_id?: string
  organizations?: {
    id: string
    name: string
    slug: string
  }
  user_orgs: UserOrg[]
}

export default function ClientUsersPage() {
  const [allUsers, setAllUsers] = useState<OrgUser[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [orgFilter, setOrgFilter] = useState<string>('all')

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    variant: 'danger' | 'default'
    confirmLabel: string
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    variant: 'default',
    confirmLabel: 'Confirm',
  })

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (currentProfile) {
      loadAllUsers()
      loadOrganizations()
    }
  }, [currentProfile])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()

      setCurrentProfile(data)
      setUserRole(data?.role || '')
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadAllUsers = async () => {
    setLoading(true)
    try {
      const isAdminManager = ['admin', 'manager'].includes(currentProfile?.role)

      let query = (supabase as any)
        .from('profiles')
        .select(`*, organizations(id, name, slug)`)
        .order('created_at', { ascending: false })

      // RLS handles client visibility (only shared org users)
      const { data, error } = await query

      if (error) throw error

      // Fetch all user_organizations with org names
      const { data: userOrgsData } = await (supabase as any)
        .from('user_organizations')
        .select('user_id, org_id, is_primary, organization:organizations(id, name)')

      // Build lookup: userId -> UserOrg[]
      const userOrgsMap: Record<string, UserOrg[]> = {}
      if (userOrgsData) {
        for (const uo of userOrgsData) {
          if (!userOrgsMap[uo.user_id]) userOrgsMap[uo.user_id] = []
          userOrgsMap[uo.user_id].push({
            org_id: uo.org_id,
            name: uo.organization?.name || 'Unknown',
            is_primary: uo.is_primary,
          })
        }
      }

      // Merge user_orgs into each user
      const usersWithOrgs = (data || []).map((user: any) => ({
        ...user,
        user_orgs: userOrgsMap[user.id] || [],
      }))

      setAllUsers(usersWithOrgs)
    } catch (error) {
      console.error('Error loading all users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadOrganizations = async () => {
    try {
      const { data } = await (supabase as any)
        .from('organizations')
        .select('id, name, slug')
        .order('name')

      setOrganizations(data || [])
    } catch (error) {
      console.error('Error loading organizations:', error)
    }
  }

  const handleInviteUser = () => {
    setShowInviteModal(true)
  }

  const handleEditUser = (user: OrgUser) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDeactivateUser = (user: OrgUser) => {
    const isActive = user.is_active
    setConfirmDialog({
      isOpen: true,
      title: isActive ? 'Deactivate User' : 'Activate User',
      message: isActive
        ? `Are you sure you want to deactivate ${user.full_name || user.email}? They will no longer be able to log in.`
        : `Are you sure you want to reactivate ${user.full_name || user.email}?`,
      variant: isActive ? 'danger' : 'default',
      confirmLabel: isActive ? 'Deactivate' : 'Activate',
      onConfirm: async () => {
        setDeletingUserId(user.id)
        try {
          const { error } = await (supabase as any)
            .from('profiles')
            .update({ is_active: !isActive })
            .eq('id', user.id)

          if (error) throw error

          toast.success(isActive ? 'User deactivated' : 'User activated')
          loadAllUsers()
        } catch (error: any) {
          console.error('Error updating user:', error)
          toast.error(error.message || 'Failed to update user')
        } finally {
          setDeletingUserId(null)
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      },
    })
  }

  const handleSendMagicLink = async (userId: string, userEmail: string) => {
    try {
      const response = await authFetch('/api/users-send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send magic link')
      }

      toast.success(`Magic link sent to ${userEmail}`)
    } catch (error: any) {
      console.error('Error sending magic link:', error)
      toast.error(error.message || 'Failed to send magic link')
    }
  }

  const handleUpdateUserOrgs = async (userId: string, orgIds: string[]) => {
    try {
      const profileResponse = await authFetch(`/api/users-update-profile?id=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_ids: orgIds }),
      })

      if (!profileResponse.ok) {
        const data = await profileResponse.json()
        throw new Error(data.error || 'Failed to update user organizations')
      }

      toast.success('User organizations updated')
      loadAllUsers()
    } catch (error: any) {
      console.error('Error updating user organizations:', error)
      toast.error(error.message || 'Failed to update user organizations')
    }
  }

  const handleInviteComplete = () => {
    setShowInviteModal(false)
    loadAllUsers()
  }

  const handleEditComplete = () => {
    setShowEditModal(false)
    setSelectedUser(null)
    loadAllUsers()
  }

  const isAdminManager = ['admin', 'manager'].includes(userRole)
  const isClientView = ['client', 'client_no_access'].includes(userRole)
  const profileObj = currentProfile ? { role: userRole } as any : null
  const allowedRoles = getAllowedInviteRoles(profileObj)

  const howardUsers = useMemo(
    () => allUsers.filter(u => ['admin', 'manager', 'user'].includes(u.role)),
    [allUsers]
  )

  const clientUsers = useMemo(() => {
    const clients = allUsers.filter(u => ['client', 'client_no_access'].includes(u.role))
    if (orgFilter === 'all') return clients
    return clients.filter(u => u.user_orgs.some(uo => uo.org_id === orgFilter))
  }, [allUsers, orgFilter])

  if (loading && !currentProfile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Topbar */}
        <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Users
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdminManager ? 'Manage all client and team users' : 'View users in your organization'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <Tabs defaultValue={isClientView ? 'my-team' : 'howard'} className="max-w-6xl">
            <TabsList>
              {isClientView ? (
                <>
                  <TabsTrigger value="my-team">My Team ({clientUsers.length})</TabsTrigger>
                  <TabsTrigger value="howard-team">Howard Team ({howardUsers.length})</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="howard">Howard Users ({howardUsers.length})</TabsTrigger>
                  <TabsTrigger value="clients">Client Users ({clientUsers.length})</TabsTrigger>
                </>
              )}
            </TabsList>

            {isClientView ? (
              <>
                <TabsContent value="my-team">
                  <UsersDataTable
                    users={clientUsers}
                    organizations={organizations}
                    loading={loading}
                    userRole={userRole}
                    onInviteUser={handleInviteUser}
                    onEditUser={handleEditUser}
                    onDeactivateUser={handleDeactivateUser}
                    onSendMagicLink={handleSendMagicLink}
                    onUpdateUserOrgs={handleUpdateUserOrgs}
                    deletingUserId={deletingUserId}
                    availableRoleFilters={['client', 'client_no_access']}
                  />
                </TabsContent>
                <TabsContent value="howard-team">
                  <UsersDataTable
                    users={howardUsers}
                    organizations={organizations}
                    loading={loading}
                    userRole={userRole}
                    onInviteUser={handleInviteUser}
                    onEditUser={handleEditUser}
                    onDeactivateUser={handleDeactivateUser}
                    onSendMagicLink={handleSendMagicLink}
                    onUpdateUserOrgs={handleUpdateUserOrgs}
                    deletingUserId={deletingUserId}
                    availableRoleFilters={['admin', 'manager', 'user']}
                    hideInvite
                  />
                </TabsContent>
              </>
            ) : (
              <>
                <TabsContent value="howard">
                  <UsersDataTable
                    users={howardUsers}
                    organizations={organizations}
                    loading={loading}
                    userRole={userRole}
                    onInviteUser={handleInviteUser}
                    onEditUser={handleEditUser}
                    onDeactivateUser={handleDeactivateUser}
                    onSendMagicLink={handleSendMagicLink}
                    onUpdateUserOrgs={handleUpdateUserOrgs}
                    deletingUserId={deletingUserId}
                    availableRoleFilters={['admin', 'manager', 'user']}
                  />
                </TabsContent>
                <TabsContent value="clients">
                  {/* Org filter for admin/manager Client Users tab */}
                  <div className="mb-4">
                    <Select value={orgFilter} onValueChange={setOrgFilter}>
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Filter by organization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Organizations</SelectItem>
                        {organizations.map(org => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <UsersDataTable
                    users={clientUsers}
                    organizations={organizations}
                    loading={loading}
                    userRole={userRole}
                    onInviteUser={handleInviteUser}
                    onEditUser={handleEditUser}
                    onDeactivateUser={handleDeactivateUser}
                    onSendMagicLink={handleSendMagicLink}
                    onUpdateUserOrgs={handleUpdateUserOrgs}
                    deletingUserId={deletingUserId}
                    availableRoleFilters={['client', 'client_no_access']}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onComplete={handleInviteComplete}
        organizations={organizations.map(o => ({ id: o.id, name: o.name }))}
        allowedRoles={allowedRoles.map(r => r as string)}
        {...(!isAdminManager && currentProfile?.org_id ? { orgId: currentProfile.org_id } : {})}
      />

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          user={selectedUser}
          onComplete={handleEditComplete}
          organizations={organizations.map(o => ({ id: o.id, name: o.name }))}
        />
      )}

      {/* Confirm AlertDialog */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => { if (!open) setConfirmDialog(prev => ({ ...prev, isOpen: false })) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm} className={confirmDialog.variant === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
              {confirmDialog.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
