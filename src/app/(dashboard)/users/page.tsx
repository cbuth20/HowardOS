'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, UserCog, Mail, Shield, Users as UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { InviteUserModal } from '@/components/users/InviteUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'client'
  is_active: boolean
  avatar_url: string | null
  created_at: string
  organizations?: {
    name: string
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'client'>('all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null }
      setCurrentUserRole(data?.role || '')
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current user's org_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, role')
        .eq('id', user.id)
        .single() as { data: { org_id: string; role: 'admin' | 'client' } | null }

      if (!profile) return

      // Fetch users - admins see all, clients see only their org
      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          is_active,
          avatar_url,
          created_at,
          organizations (
            name
          )
        `)

      // Only filter by org_id if user is a client
      if (profile.role === 'client') {
        query = query.eq('org_id', profile.org_id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term)
      )
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleInviteComplete = () => {
    setShowInviteModal(false)
    fetchUsers()
  }

  const handleEditComplete = () => {
    setEditingUser(null)
    fetchUsers()
  }

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    clients: users.filter((u) => u.role === 'client').length,
    active: users.filter((u) => u.is_active).length,
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Sticky Topbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-border shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">
              User Management
            </h1>
            <p className="text-sm text-text-muted">
              Manage users and permissions for your organization
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowInviteModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-4 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-brand-primary before:rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-navy">{stats.total}</p>
                <p className="text-xs text-text-muted">Total Users</p>
              </div>
            </div>
          </div>

          <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-4 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-brand-navy before:rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-navy/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-brand-navy" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-navy">{stats.admins}</p>
                <p className="text-xs text-text-muted">Admins</p>
              </div>
            </div>
          </div>

          <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-4 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-brand-slate before:rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-slate/10 rounded-lg flex items-center justify-center">
                <UserCog className="w-5 h-5 text-brand-slate" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-navy">{stats.clients}</p>
                <p className="text-xs text-text-muted">Clients</p>
              </div>
            </div>
          </div>

          <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-4 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-state-success before:rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-state-success/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-state-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-navy">{stats.active}</p>
                <p className="text-xs text-text-muted">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-background-card rounded-lg shadow-sm border border-neutral-border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex gap-2">
            <Button
              variant={roleFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setRoleFilter('all')}
            >
              All
            </Button>
            <Button
              variant={roleFilter === 'admin' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setRoleFilter('admin')}
            >
              Admins
            </Button>
            <Button
              variant={roleFilter === 'client' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setRoleFilter('client')}
            >
              Clients
            </Button>
          </div>
        </div>
      </div>

        {/* Users List */}
        <div className="bg-background-card rounded-lg shadow-sm border border-neutral-border">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-text-muted mt-4">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 mx-auto text-text-muted mb-4" />
            <p className="text-text-muted">
              {searchTerm || roleFilter !== 'all'
                ? 'No users match your filters'
                : 'No users yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-border">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 hover:bg-background-hover transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* User Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar
                      name={user.full_name || user.email}
                      email={user.email}
                      role={user.role}
                      src={user.avatar_url || undefined}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-text-primary truncate">
                          {user.full_name || user.email}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-brand-navy/20 text-brand-navy'
                              : 'bg-brand-slate/20 text-brand-slate'
                          }`}
                        >
                          {user.role}
                        </span>
                        {!user.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-state-error/20 text-state-error">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-muted truncate">{user.email}</p>
                      <p className="text-xs text-text-muted">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingUser(user)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

        {/* Modals */}
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onComplete={handleInviteComplete}
        />

        {editingUser && (
          <EditUserModal
            isOpen={true}
            onClose={() => setEditingUser(null)}
            user={editingUser}
            onComplete={handleEditComplete}
          />
        )}
      </div>
    </div>
  )
}
