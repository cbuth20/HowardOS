'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { FilterChip, FilterChipGroup } from '@/components/ui/FilterChip'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InviteUserModal } from '@/components/users/InviteUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import { AddExistingUserModal } from '@/components/users/AddExistingUserModal'
import { ClientOrgTasks } from '@/components/clients/ClientOrgTasks'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskFormData } from '@/types/tasks'
import { authFetch } from '@/lib/utils/auth-fetch'
import {
  Users,
  Link as LinkIcon,
  Loader2,
  Save,
  ChevronRight,
  UserPlus,
  Pencil,
  Trash2,
  Building2,
  Upload,
  Search,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Power
} from 'lucide-react'
import toast from 'react-hot-toast'

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
  role: 'admin' | 'client'
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
}

type SortField = 'name' | 'role' | 'organization' | 'status' | 'joined'
type SortDirection = 'asc' | 'desc'

export default function ClientsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [savingUrl, setSavingUrl] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  // Modal states
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showInviteUserModal, setShowInviteUserModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)
  const [showAddExistingUserModal, setShowAddExistingUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)
  const [allUsers, setAllUsers] = useState<OrgUser[]>([])
  const [loadingAllUsers, setLoadingAllUsers] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'client'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [mainTab, setMainTab] = useState<'organizations' | 'users'>('organizations')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  // Form states
  const [dashboardUrl, setDashboardUrl] = useState('')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'users'>('dashboard')
  const [newOrgName, setNewOrgName] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Task modal states
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [allOrganizations, setAllOrganizations] = useState<any[]>([])
  const [currentProfile, setCurrentProfile] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    loadOrganizations()
    loadAllUsers()
    loadProfile()
    loadUsersForTasks()
  }, [])

  const loadOrganizations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching organizations:', error)
        throw error
      }

      // Get counts for each organization with error handling per org
      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org: Organization) => {
          try {
            const { count: userCount, error: userError } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('org_id', org.id)

            if (userError) {
              console.error(`Error counting users for ${org.name}:`, userError)
            }

            const { count: taskCount, error: taskError } = await supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('org_id', org.id)

            if (taskError) {
              console.error(`Error counting tasks for ${org.name}:`, taskError)
            }

            return {
              ...org,
              _count: { users: userCount || 0, tasks: taskCount || 0 }
            }
          } catch (err) {
            console.error(`Error processing org ${org.name}:`, err)
            return {
              ...org,
              _count: { users: 0, tasks: 0 }
            }
          }
        })
      )

      setOrganizations(orgsWithCounts)
    } catch (error) {
      console.error('Error loading organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

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

  const handleSelectOrg = async (org: Organization) => {
    setSelectedOrg(org)
    setShowOrgModal(true)
    setActiveTab('dashboard')

    const { data } = await (supabase as any)
      .from('profiles')
      .select('dashboard_iframe_url')
      .eq('org_id', org.id)
      .eq('role', 'client')
      .limit(1)
      .single()

    setDashboardUrl(data?.dashboard_iframe_url || '')
    loadOrgUsers(org.id)
  }

  const handleSaveDashboardUrl = async () => {
    if (!selectedOrg) return

    setSavingUrl(true)
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ dashboard_iframe_url: dashboardUrl.trim() || null })
        .eq('org_id', selectedOrg.id)
        .eq('role', 'client')

      if (error) throw error

      toast.success('Dashboard URL updated for all clients in this organization')
    } catch (error: any) {
      console.error('Error saving URL:', error)
      toast.error(error.message || 'Failed to save URL')
    } finally {
      setSavingUrl(false)
    }
  }

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()

      setCurrentProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
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

  const handleCreateTaskForOrg = () => {
    setShowTaskModal(true)
  }

  const handleTaskSave = async (formData: TaskFormData & { target_org_id?: string }) => {
    try {
      const taskData = {
        ...formData,
        target_org_id: selectedOrg?.id,
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
      if (selectedOrg) {
        loadOrganizations()
      }
    } catch (error: any) {
      console.error('Error creating task:', error)
      toast.error(error.message || 'Failed to create task')
      throw error
    }
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
          if (selectedOrg) {
            loadOrgUsers(selectedOrg.id)
          }
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

  const handleDeleteOrgUser = (user: OrgUser) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate User',
      message: `Are you sure you want to deactivate ${user.full_name || user.email}? They will no longer be able to log in.`,
      variant: 'danger',
      confirmLabel: 'Deactivate',
      onConfirm: async () => {
        setDeletingUserId(user.id)
        try {
          const { error } = await (supabase as any)
            .from('profiles')
            .update({ is_active: false })
            .eq('id', user.id)

          if (error) throw error

          toast.success('User deactivated')
          if (selectedOrg) {
            loadOrgUsers(selectedOrg.id)
          }
        } catch (error: any) {
          console.error('Error deleting user:', error)
          toast.error(error.message || 'Failed to delete user')
        } finally {
          setDeletingUserId(null)
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      },
    })
  }

  const handleEditUser = (user: OrgUser) => {
    setSelectedUser(user)
    setShowEditModal(true)
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

  const handleInviteComplete = () => {
    setShowInviteModal(false)
    if (selectedOrg) {
      loadOrgUsers(selectedOrg.id)
      loadOrganizations()
    }
  }

  const handleInviteUserComplete = () => {
    setShowInviteUserModal(false)
    loadAllUsers()
    loadOrganizations()
  }

  const handleAddExistingUserComplete = () => {
    if (selectedOrg) {
      loadOrgUsers(selectedOrg.id)
      loadOrganizations()
      loadAllUsers()
    }
  }

  const handleEditComplete = () => {
    setShowEditModal(false)
    setSelectedUser(null)
    loadAllUsers()
    if (selectedOrg) {
      loadOrgUsers(selectedOrg.id)
    }
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) {
      toast.error('Organization name is required')
      return
    }

    setCreatingOrg(true)
    try {
      const slug = newOrgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const { error } = await (supabase as any)
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          slug: slug,
        })

      if (error) throw error

      toast.success('Organization created successfully')
      setNewOrgName('')
      setShowCreateOrgModal(false)
      loadOrganizations()
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast.error(error.message || 'Failed to create organization')
    } finally {
      setCreatingOrg(false)
    }
  }

  const loadAllUsers = async () => {
    setLoadingAllUsers(true)
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select(`
          *,
          organizations(id, name, slug)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllUsers(data || [])
    } catch (error) {
      console.error('Error loading all users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoadingAllUsers(false)
    }
  }

  const handleReassignUser = async (userId: string, newOrgId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ org_id: newOrgId })
        .eq('id', userId)

      if (error) throw error

      toast.success('User reassigned successfully')
      loadAllUsers()
      loadOrganizations()
    } catch (error: any) {
      console.error('Error reassigning user:', error)
      toast.error(error.message || 'Failed to reassign user')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedOrg) return
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
      const filePath = `organizations/${selectedOrg.id}/logo.${fileExt}`

      const { error: uploadError } = await (supabase as any).storage
        .from('files')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      const { data } = (supabase as any).storage
        .from('files')
        .getPublicUrl(filePath)

      const logoUrl = data.publicUrl

      const { error: updateError } = await (supabase as any)
        .from('organizations')
        .update({ logo_url: logoUrl })
        .eq('id', selectedOrg.id)

      if (updateError) throw updateError

      toast.success('Logo uploaded successfully')
      setSelectedOrg({ ...selectedOrg, logo_url: logoUrl })
      loadOrganizations()
    } catch (error: any) {
      console.error('Logo upload error:', error)
      toast.error(error.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />
  }

  // Filtered and sorted users for the All Users data table
  const filteredSortedUsers = useMemo(() => {
    let filtered = allUsers.filter(user => {
      const matchesSearch = !searchTerm ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active)
      return matchesSearch && matchesRole && matchesStatus
    })

    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = (a.full_name || a.email).localeCompare(b.full_name || b.email)
          break
        case 'role':
          comparison = a.role.localeCompare(b.role)
          break
        case 'organization':
          comparison = (a.organizations?.name || '').localeCompare(b.organizations?.name || '')
          break
        case 'status':
          comparison = (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1
          break
        case 'joined':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [allUsers, searchTerm, roleFilter, statusFilter, sortField, sortDirection])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Topbar */}
        <div className="flex-shrink-0 bg-white border-b border-neutral-border shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-brand-primary" />
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-text-primary">
                  Client Manager
                </h1>
                <p className="text-sm text-text-muted mt-1">
                  Manage client organizations, dashboards, and users
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex-shrink-0 bg-white border-b border-neutral-border px-8">
          <div className="flex gap-6">
            <button
              onClick={() => setMainTab('organizations')}
              className={`py-3 px-1 border-b-2 transition-colors ${
                mainTab === 'organizations'
                  ? 'border-brand-primary text-brand-primary font-medium'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Building2 className="w-4 h-4 inline mr-2" />
              Organizations
            </button>
            <button
              onClick={() => setMainTab('users')}
              className={`py-3 px-1 border-b-2 transition-colors ${
                mainTab === 'users'
                  ? 'border-brand-primary text-brand-primary font-medium'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              All Users
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          {mainTab === 'organizations' ? (
            <div className="max-w-6xl space-y-4">
              <div className="flex justify-end mb-4">
                <Button
                  variant="primary"
                  onClick={() => setShowCreateOrgModal(true)}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  New Organization
                </Button>
              </div>
            {organizations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-neutral-border">
                <Building2 className="w-12 h-12 mx-auto text-text-muted mb-4" />
                <p className="text-text-muted">No client organizations found</p>
              </div>
            ) : (
              organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className="w-full bg-white rounded-lg shadow-sm border border-neutral-border p-6 hover:shadow-md hover:border-brand-primary/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-brand-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">
                          {org.name}
                        </h3>
                        <p className="text-sm text-text-muted">
                          {org._count?.users || 0} users • {org._count?.tasks || 0} tasks
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-muted" />
                  </div>
                </button>
              ))
            )}
            </div>
          ) : (
            // All Users Tab Content
            <div className="max-w-6xl space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-text-muted">
                <span><span className="font-semibold text-text-primary">{allUsers.length}</span> users</span>
                <span className="text-neutral-border">|</span>
                <span><span className="font-semibold text-text-primary">{allUsers.filter(u => u.role === 'admin').length}</span> admins</span>
                <span className="text-neutral-border">|</span>
                <span><span className="font-semibold text-text-primary">{allUsers.filter(u => u.role === 'client').length}</span> clients</span>
                <span className="text-neutral-border">|</span>
                <span><span className="font-semibold text-state-success">{allUsers.filter(u => u.is_active).length}</span> active</span>
              </div>

              {/* Toolbar: Search + Filters + Invite */}
              <div className="flex gap-3 bg-white p-4 rounded-lg border border-neutral-border items-center">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                </div>
                <FilterChipGroup label="Role">
                  <FilterChip label="All" isActive={roleFilter === 'all'} onClick={() => setRoleFilter('all')} size="sm" />
                  <FilterChip label="Admins" isActive={roleFilter === 'admin'} onClick={() => setRoleFilter('admin')} size="sm" />
                  <FilterChip label="Clients" isActive={roleFilter === 'client'} onClick={() => setRoleFilter('client')} size="sm" />
                </FilterChipGroup>
                <div className="w-px h-8 bg-neutral-border" />
                <FilterChipGroup label="Status">
                  <FilterChip label="All" isActive={statusFilter === 'all'} onClick={() => setStatusFilter('all')} size="sm" />
                  <FilterChip label="Active" isActive={statusFilter === 'active'} onClick={() => setStatusFilter('active')} size="sm" />
                  <FilterChip label="Inactive" isActive={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} size="sm" />
                </FilterChipGroup>
                <div className="w-px h-8 bg-neutral-border" />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowInviteUserModal(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-lg border border-neutral-border overflow-hidden">
                {loadingAllUsers ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                  </div>
                ) : filteredSortedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-text-muted mb-4" />
                    <p className="text-text-muted">
                      {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'No users match your filters'
                        : 'No users yet'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-border bg-background-subtle">
                        <th className="text-left px-4 py-3">
                          <button
                            onClick={() => handleSort('name')}
                            className="flex items-center text-xs font-semibold text-text-muted uppercase tracking-wider hover:text-text-primary"
                          >
                            Name / Email
                            <SortIcon field="name" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3">
                          <button
                            onClick={() => handleSort('role')}
                            className="flex items-center text-xs font-semibold text-text-muted uppercase tracking-wider hover:text-text-primary"
                          >
                            Role
                            <SortIcon field="role" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3">
                          <button
                            onClick={() => handleSort('organization')}
                            className="flex items-center text-xs font-semibold text-text-muted uppercase tracking-wider hover:text-text-primary"
                          >
                            Organization
                            <SortIcon field="organization" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3">
                          <button
                            onClick={() => handleSort('status')}
                            className="flex items-center text-xs font-semibold text-text-muted uppercase tracking-wider hover:text-text-primary"
                          >
                            Status
                            <SortIcon field="status" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3">
                          <button
                            onClick={() => handleSort('joined')}
                            className="flex items-center text-xs font-semibold text-text-muted uppercase tracking-wider hover:text-text-primary"
                          >
                            Joined
                            <SortIcon field="joined" />
                          </button>
                        </th>
                        <th className="text-right px-4 py-3">
                          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                            Actions
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-border">
                      {filteredSortedUsers.map(user => (
                        <tr
                          key={user.id}
                          className="hover:bg-background-hover transition-colors"
                        >
                          {/* Name / Email */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={user.full_name || user.email}
                                email={user.email}
                                src={user.avatar_url || undefined}
                                role={user.role}
                                size="md"
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-text-primary text-sm truncate">
                                  {user.full_name || user.email}
                                </p>
                                <p className="text-xs text-text-muted truncate">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${
                                user.role === 'admin'
                                  ? 'bg-brand-navy/10 text-brand-navy'
                                  : 'bg-brand-slate/10 text-brand-slate'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>

                          {/* Organization */}
                          <td className="px-4 py-3">
                            <select
                              value={user.org_id || ''}
                              onChange={(e) => handleReassignUser(user.id, e.target.value)}
                              className="text-sm border border-neutral-border rounded px-2 py-1 bg-white max-w-[180px]"
                            >
                              <option value="">No Organization</option>
                              {organizations.map(org => (
                                <option key={org.id} value={org.id}>
                                  {org.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${
                                user.is_active
                                  ? 'bg-state-success/10 text-state-success'
                                  : 'bg-state-error/10 text-state-error'
                              }`}
                            >
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Joined */}
                          <td className="px-4 py-3">
                            <span className="text-sm text-text-muted">
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                title="Edit user"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {user.is_active && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendMagicLink(user.id, user.email)}
                                  title="Send magic link"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivateUser(user)}
                                disabled={deletingUserId === user.id}
                                title={user.is_active ? 'Deactivate user' : 'Activate user'}
                              >
                                <Power className={`w-4 h-4 ${user.is_active ? 'text-state-error' : 'text-state-success'}`} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Organization Details Modal */}
      {selectedOrg && (
        <Modal
          isOpen={showOrgModal}
          onClose={() => {
            setShowOrgModal(false)
            setSelectedOrg(null)
          }}
          title={selectedOrg.name}
          size="xl"
        >
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-neutral-border">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'dashboard'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <LinkIcon className="w-4 h-4 inline mr-2" />
                Dashboard URL
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'tasks'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'users'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Users ({orgUsers.length})
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Organization Logo */}
                <div className="pb-6 border-b border-neutral-border">
                  <h3 className="text-sm font-medium text-text-primary mb-3">
                    Organization Logo
                  </h3>
                  <div className="flex items-center gap-4">
                    {selectedOrg.logo_url ? (
                      <img
                        src={selectedOrg.logo_url}
                        alt={selectedOrg.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-brand-primary" />
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
                              {selectedOrg.logo_url ? 'Change Logo' : 'Upload Logo'}
                            </>
                          )}
                        </Button>
                      </label>
                      <p className="text-xs text-text-muted mt-1">
                        Square image recommended. Max 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dashboard URL */}
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">
                    Analytics Dashboard URL
                  </h3>
                  <p className="text-sm text-text-muted mb-3">
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
                      variant="primary"
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
                </div>
              </div>
            )}

            {activeTab === 'tasks' && selectedOrg && (
              <ClientOrgTasks
                orgId={selectedOrg.id}
                orgName={selectedOrg.name}
                onCreateTask={handleCreateTaskForOrg}
              />
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-muted">
                    Manage users in {selectedOrg.name}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddExistingUserModal(true)}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Add Existing
                  </Button>
                </div>

                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                  </div>
                ) : orgUsers.length === 0 ? (
                  <div className="text-center py-8 bg-background-subtle rounded-lg">
                    <Users className="w-12 h-12 mx-auto text-text-muted mb-2" />
                    <p className="text-text-muted">No users in this organization</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-background-subtle rounded-lg border border-neutral-border"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={user.full_name || user.email}
                            email={user.email}
                            src={user.avatar_url || undefined}
                            role={user.role}
                            size="md"
                          />
                          <div>
                            <p className="font-medium text-text-primary">
                              {user.full_name || user.email}
                            </p>
                            <p className="text-sm text-text-muted">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  user.role === 'admin'
                                    ? 'bg-brand-navy/10 text-brand-navy'
                                    : 'bg-brand-slate/10 text-brand-slate'
                                }`}
                              >
                                {user.role}
                              </span>
                              {!user.is_active && (
                                <span className="text-xs px-2 py-0.5 rounded bg-state-error/10 text-state-error">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOrgUser(user)}
                            disabled={deletingUserId === user.id}
                          >
                            <Trash2 className="w-4 h-4 text-state-error" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Invite User Modal (from org modal - kept for backward compat but no longer shown) */}
      {selectedOrg && (
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onComplete={handleInviteComplete}
          orgId={selectedOrg.id}
        />
      )}

      {/* Invite User Modal (from All Users tab) */}
      <InviteUserModal
        isOpen={showInviteUserModal}
        onClose={() => setShowInviteUserModal(false)}
        onComplete={handleInviteUserComplete}
        organizations={organizations.map(o => ({ id: o.id, name: o.name }))}
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
      {selectedOrg && (
        <AddExistingUserModal
          isOpen={showAddExistingUserModal}
          onClose={() => setShowAddExistingUserModal(false)}
          targetOrgId={selectedOrg.id}
          targetOrgName={selectedOrg.name}
          currentOrgUserIds={orgUsers.map((u) => u.id)}
          onComplete={handleAddExistingUserComplete}
        />
      )}

      {/* Create Organization Modal */}
      <Modal
        isOpen={showCreateOrgModal}
        onClose={() => {
          setShowCreateOrgModal(false)
          setNewOrgName('')
        }}
        title="Create New Organization"
        size="md"
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-text-primary mb-2">
              Organization Name *
            </label>
            <Input
              id="orgName"
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              required
              disabled={creatingOrg}
              autoFocus
            />
            <p className="text-xs text-text-muted mt-1">
              This will be the client organization name
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCreateOrgModal(false)
                setNewOrgName('')
              }}
              disabled={creatingOrg}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={creatingOrg || !newOrgName.trim()}
            >
              {creatingOrg ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Create Organization
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Task Modal */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        task={null}
        onSave={handleTaskSave}
        users={users}
        organizations={allOrganizations}
        profile={currentProfile}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
      />

    </>
  )
}
