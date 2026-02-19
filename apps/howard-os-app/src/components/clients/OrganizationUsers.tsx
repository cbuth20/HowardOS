'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@howard/ui/lib/supabase/client'
import { Button } from '@howard/ui/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@howard/ui/components/ui/table'
import { HowardAvatar } from '@howard/ui/components/ui/howard-avatar'
import { HowardBadge } from '@howard/ui/components/ui/howard-badge'
import { InviteUserModal } from '@/components/users/InviteUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import { AddExistingUserModal } from '@/components/users/AddExistingUserModal'
import { canInviteUsers, getAllowedInviteRoles } from '@howard/ui/lib/auth/permissions'
import {
  Users,
  Loader2,
  UserPlus,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

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
}

interface OrganizationUsersProps {
  orgId: string
  orgName: string
  userRole: string
  currentProfile: any
  onDataChanged: () => void
}

export function OrganizationUsers({
  orgId,
  orgName,
  userRole,
  currentProfile,
  onDataChanged,
}: OrganizationUsersProps) {
  const supabase = createClient()

  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddExistingUserModal, setShowAddExistingUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)

  const isAdminManager = ['admin', 'manager'].includes(userRole)
  const isClientRole = userRole === 'client'
  const isReadOnly = userRole === 'client_no_access'
  const profileObj = currentProfile ? { role: userRole } as any : null
  const canInvite = canInviteUsers(profileObj)
  const allowedRoles = getAllowedInviteRoles(profileObj)

  useEffect(() => {
    loadOrgUsers()
  }, [orgId])

  const loadOrgUsers = async () => {
    setLoadingUsers(true)
    try {
      const { data, error } = await (supabase as any)
        .from('user_organizations')
        .select(`
          user_id,
          profiles!inner(id, email, full_name, role, is_active, avatar_url, dashboard_iframe_url, created_at, org_id)
        `)
        .eq('org_id', orgId)

      if (error) throw error

      const users: OrgUser[] = (data || []).map((row: any) => ({
        ...row.profiles,
      }))

      users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setOrgUsers(users)
    } catch (error) {
      console.error('Error loading org users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleDeleteOrgUser = async (user: OrgUser) => {
    setDeletingUserId(user.id)
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ is_active: false })
        .eq('id', user.id)

      if (error) throw error

      toast.success('User deactivated')
      loadOrgUsers()
    } catch (error: any) {
      console.error('Error deactivating user:', error)
      toast.error(error.message || 'Failed to deactivate user')
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleEditUser = (user: OrgUser) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleInviteComplete = () => {
    setShowInviteModal(false)
    loadOrgUsers()
    onDataChanged()
  }

  const handleAddExistingUserComplete = () => {
    loadOrgUsers()
    onDataChanged()
  }

  const handleEditComplete = () => {
    setShowEditModal(false)
    setSelectedUser(null)
    loadOrgUsers()
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Manage users in {orgName}
          </p>
          <div className="flex items-center gap-2">
            {isAdminManager && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddExistingUserModal(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                Add Existing
              </Button>
            )}
            {canInvite && (
              <Button
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            )}
          </div>
        </div>

        {loadingUsers ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : orgUsers.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No users in this organization</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {!isReadOnly && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <HowardAvatar
                        name={user.full_name || user.email}
                        email={user.email}
                        src={user.avatar_url || undefined}
                        role={user.role}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <HowardBadge variant={`role-${user.role}` as any}>
                      {user.role}
                    </HowardBadge>
                  </TableCell>
                  <TableCell>
                    <HowardBadge variant={user.is_active ? 'status-active' as any : 'status-inactive' as any}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </HowardBadge>
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(isAdminManager || (isClientRole && ['client', 'client_no_access'].includes(user.role))) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isAdminManager && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDeleteOrgUser(user)}
                            disabled={deletingUserId === user.id}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onComplete={handleInviteComplete}
        orgId={orgId}
        allowedRoles={allowedRoles.map(r => r as string)}
      />

      {selectedUser && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          user={selectedUser}
          onComplete={handleEditComplete}
        />
      )}

      {isAdminManager && (
        <AddExistingUserModal
          isOpen={showAddExistingUserModal}
          onClose={() => setShowAddExistingUserModal(false)}
          targetOrgId={orgId}
          targetOrgName={orgName}
          currentOrgUserIds={orgUsers.map((u) => u.id)}
          onComplete={handleAddExistingUserComplete}
        />
      )}
    </>
  )
}
