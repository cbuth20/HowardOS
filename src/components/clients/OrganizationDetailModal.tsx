'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { HowardAvatar } from '@/components/ui/howard-avatar'
import { HowardBadge } from '@/components/ui/howard-badge'
import { ClientOrgTasks } from '@/components/clients/ClientOrgTasks'
import { InviteUserModal } from '@/components/users/InviteUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import { AddExistingUserModal } from '@/components/users/AddExistingUserModal'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskFormData } from '@/types/tasks'
import { authFetch } from '@/lib/utils/auth-fetch'
import { isAdminOrManager, isClient, canInviteUsers, getAllowedInviteRoles } from '@/lib/auth/permissions'
import {
  Users,
  Link as LinkIcon,
  Loader2,
  Save,
  UserPlus,
  Pencil,
  Trash2,
  Building2,
  Upload,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  _count?: {
    users: number
    tasks: number
  }
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
}

interface OrganizationDetailModalProps {
  organization: Organization | null
  isOpen: boolean
  onClose: () => void
  onDataChanged: () => void
  userRole: string
  currentProfile: any
}

export function OrganizationDetailModal({
  organization,
  isOpen,
  onClose,
  onDataChanged,
  userRole,
  currentProfile,
}: OrganizationDetailModalProps) {
  const supabase = createClient()

  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [dashboardUrl, setDashboardUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'users'>('dashboard')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddExistingUserModal, setShowAddExistingUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [allOrganizations, setAllOrganizations] = useState<any[]>([])

  const isAdminManager = ['admin', 'manager'].includes(userRole)
  const isClientRole = userRole === 'client'
  const isReadOnly = userRole === 'client_no_access'
  const profileObj = currentProfile ? { role: userRole } as any : null
  const canInvite = canInviteUsers(profileObj)
  const allowedRoles = getAllowedInviteRoles(profileObj)

  useEffect(() => {
    if (organization && isOpen) {
      loadOrgUsers(organization.id)
      loadDashboardUrl(organization.id)
      if (isAdminManager) {
        loadUsersForTasks()
      }
    }
  }, [organization, isOpen])

  const loadOrgUsers = async (orgId: string) => {
    setLoadingUsers(true)
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrgUsers(data || [])
    } catch (error) {
      console.error('Error loading org users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadDashboardUrl = async (orgId: string) => {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('dashboard_iframe_url')
      .eq('org_id', orgId)
      .eq('role', 'client')
      .limit(1)
      .single()

    setDashboardUrl(data?.dashboard_iframe_url || '')
  }

  const loadUsersForTasks = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, org_id')
        .order('full_name')

      setUsers(data || [])

      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name')

      setAllOrganizations(orgs || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleSaveDashboardUrl = async () => {
    if (!organization) return

    setSavingUrl(true)
    try {
      const response = await authFetch('/api/organizations-update-dashboard-url', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organization.id,
          dashboardUrl: dashboardUrl.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update dashboard URL')
      }

      toast.success('Dashboard URL updated for all clients in this organization')
    } catch (error: any) {
      console.error('Error saving URL:', error)
      toast.error(error.message || 'Failed to save URL')
    } finally {
      setSavingUrl(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!organization) return
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    setUploadingLogo(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `organizations/${organization.id}/logo.${fileExt}`

      const { error: uploadError } = await (supabase as any).storage
        .from('logos')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      // Use proxy URL instead of public URL
      const logoUrl = `/api/storage-logo?path=${encodeURIComponent(filePath)}`

      const { error: updateError } = await (supabase as any)
        .from('organizations')
        .update({ logo_url: logoUrl })
        .eq('id', organization.id)

      if (updateError) throw updateError

      toast.success('Logo uploaded successfully')
      onDataChanged()
    } catch (error: any) {
      console.error('Logo upload error:', error)
      toast.error(error.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
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
      if (organization) {
        loadOrgUsers(organization.id)
      }
    } catch (error: any) {
      console.error('Error deleting user:', error)
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
    if (organization) {
      loadOrgUsers(organization.id)
      onDataChanged()
    }
  }

  const handleAddExistingUserComplete = () => {
    if (organization) {
      loadOrgUsers(organization.id)
      onDataChanged()
    }
  }

  const handleEditComplete = () => {
    setShowEditModal(false)
    setSelectedUser(null)
    if (organization) {
      loadOrgUsers(organization.id)
    }
  }

  const handleCreateTaskForOrg = () => {
    setShowTaskModal(true)
  }

  const handleTaskSave = async (formData: TaskFormData & { target_org_id?: string }) => {
    try {
      const taskData = {
        ...formData,
        target_org_id: organization?.id,
      }

      const response = await authFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task')
      }

      toast.success('Task created')
      setShowTaskModal(false)
      onDataChanged()
    } catch (error: any) {
      console.error('Error creating task:', error)
      toast.error(error.message || 'Failed to create task')
      throw error
    }
  }

  const handleClose = () => {
    setActiveTab('dashboard')
    onClose()
  }

  if (!organization) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{organization.name}</DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dashboard' | 'tasks' | 'users')}>
            <TabsList className="h-auto rounded-none bg-transparent border-b border-border p-0 gap-6 w-full justify-start">
              <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-1 py-3 font-medium text-sm" value="dashboard">
                <LinkIcon className="w-4 h-4 mr-2" />
                Dashboard URL
              </TabsTrigger>
              <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-1 py-3 font-medium text-sm" value="tasks">
                Tasks
              </TabsTrigger>
              <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-1 py-3 font-medium text-sm" value="users">
                <Users className="w-4 h-4 mr-2" />
                Users ({orgUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <div className="space-y-6">
                {/* Organization Logo — admin/manager only */}
                {isAdminManager && (
                  <div className="pb-6 border-b border-border">
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      Organization Logo
                    </h3>
                    <div className="flex items-center gap-4">
                      {organization.logo_url ? (
                        <img
                          src={organization.logo_url}
                          alt={organization.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-primary" />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label htmlFor="logo-upload">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingLogo}
                            onClick={() => document.getElementById('logo-upload')?.click()}
                          >
                            {uploadingLogo ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                {organization.logo_url ? 'Change Logo' : 'Upload Logo'}
                              </>
                            )}
                          </Button>
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Square image recommended. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dashboard URL */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Analytics Dashboard URL
                  </h3>
                  {isAdminManager ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        Set the analytics dashboard iframe URL for all client users in this organization
                      </p>
                      <div className="space-y-3">
                        <Input
                          type="url"
                          value={dashboardUrl}
                          onChange={(e) => setDashboardUrl(e.target.value)}
                          placeholder="https://app.reachreporting.com/embed/..."
                          disabled={savingUrl}
                          className="font-mono text-sm"
                        />
                        <Button
                          onClick={handleSaveDashboardUrl}
                          disabled={savingUrl}
                        >
                          {savingUrl ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Dashboard URL
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-secondary rounded-lg">
                      <p className="text-sm text-muted-foreground font-mono break-all">
                        {dashboardUrl || 'No dashboard URL configured'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tasks">
              <ClientOrgTasks
                orgId={organization.id}
                orgName={organization.name}
                onCreateTask={isAdminManager ? handleCreateTaskForOrg : () => {}}
              />
            </TabsContent>

            <TabsContent value="users">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Manage users in {organization.name}
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
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : orgUsers.length === 0 ? (
                  <div className="text-center py-8 bg-background rounded-lg">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No users in this organization</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <HowardAvatar
                            name={user.full_name || user.email}
                            email={user.email}
                            src={user.avatar_url || undefined}
                            role={user.role}
                            size="md"
                          />
                          <div>
                            <p className="font-medium text-foreground">
                              {user.full_name || user.email}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <HowardBadge variant={`role-${user.role}` as any}>
                                {user.role}
                              </HowardBadge>
                              {!user.is_active && (
                                <HowardBadge variant="status-inactive">
                                  Inactive
                                </HowardBadge>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Actions: admin/manager get edit + deactivate, client gets edit for client roles only */}
                        {!isReadOnly && (
                          <div className="flex items-center gap-2">
                            {(isAdminManager || (isClientRole && ['client', 'client_no_access'].includes(user.role))) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {isAdminManager && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOrgUser(user)}
                                disabled={deletingUserId === user.id}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onComplete={handleInviteComplete}
        orgId={organization.id}
        allowedRoles={allowedRoles.map(r => r as string)}
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
        />
      )}

      {/* Add Existing User Modal */}
      {isAdminManager && (
        <AddExistingUserModal
          isOpen={showAddExistingUserModal}
          onClose={() => setShowAddExistingUserModal(false)}
          targetOrgId={organization.id}
          targetOrgName={organization.name}
          currentOrgUserIds={orgUsers.map((u) => u.id)}
          onComplete={handleAddExistingUserComplete}
        />
      )}

      {/* Task Modal */}
      {isAdminManager && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          task={null}
          onSave={handleTaskSave}
          users={users}
          organizations={allOrganizations}
          profile={currentProfile}
        />
      )}
    </>
  )
}
