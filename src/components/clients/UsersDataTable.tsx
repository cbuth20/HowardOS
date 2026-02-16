'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { FilterChip, FilterChipGroup } from '@/components/ui/howard-filter-chip'
import { HowardAvatar } from '@/components/ui/howard-avatar'
import { HowardBadge } from '@/components/ui/howard-badge'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Users,
  Loader2,
  UserPlus,
  Pencil,
  Search,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Power,
  X,
  ChevronDown,
} from 'lucide-react'

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

type SortField = 'name' | 'role' | 'organization' | 'status' | 'joined'
type SortDirection = 'asc' | 'desc'

interface UsersDataTableProps {
  users: OrgUser[]
  organizations: Organization[]
  loading: boolean
  userRole: string
  onInviteUser: () => void
  onEditUser: (user: OrgUser) => void
  onDeactivateUser: (user: OrgUser) => void
  onSendMagicLink: (userId: string, userEmail: string) => void
  onUpdateUserOrgs: (userId: string, orgIds: string[]) => void
  deletingUserId: string | null
}

export function UsersDataTable({
  users,
  organizations,
  loading,
  userRole,
  onInviteUser,
  onEditUser,
  onDeactivateUser,
  onSendMagicLink,
  onUpdateUserOrgs,
  deletingUserId,
}: UsersDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const isAdminManager = ['admin', 'manager'].includes(userRole)
  const isClientRole = userRole === 'client'
  const isReadOnly = userRole === 'client_no_access'
  const canInvite = ['admin', 'manager', 'client'].includes(userRole)

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

  const filteredSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
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
          comparison = (a.user_orgs?.[0]?.name || '').localeCompare(b.user_orgs?.[0]?.name || '')
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
  }, [users, searchTerm, roleFilter, statusFilter, sortField, sortDirection])

  // Role filter chips differ by role
  const roleFilterChips = isAdminManager ? (
    <>
      <FilterChip label="All" isActive={roleFilter === 'all'} onClick={() => setRoleFilter('all')} size="sm" />
      <FilterChip label="Admins" isActive={roleFilter === 'admin'} onClick={() => setRoleFilter('admin')} size="sm" />
      <FilterChip label="Managers" isActive={roleFilter === 'manager'} onClick={() => setRoleFilter('manager')} size="sm" />
      <FilterChip label="Users" isActive={roleFilter === 'user'} onClick={() => setRoleFilter('user')} size="sm" />
      <FilterChip label="Clients" isActive={roleFilter === 'client'} onClick={() => setRoleFilter('client')} size="sm" />
    </>
  ) : isClientRole ? (
    <>
      <FilterChip label="All" isActive={roleFilter === 'all'} onClick={() => setRoleFilter('all')} size="sm" />
      <FilterChip label="Clients" isActive={roleFilter === 'client'} onClick={() => setRoleFilter('client')} size="sm" />
      <FilterChip label="Contacts" isActive={roleFilter === 'client_no_access'} onClick={() => setRoleFilter('client_no_access')} size="sm" />
    </>
  ) : null

  return (
    <div className="max-w-6xl space-y-4 pb-8">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span><span className="font-semibold text-foreground">{users.length}</span> users</span>
        {isAdminManager && (
          <>
            <span className="text-border">|</span>
            <span><span className="font-semibold text-foreground">{users.filter(u => ['admin', 'manager', 'user'].includes(u.role)).length}</span> team</span>
          </>
        )}
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{users.filter(u => ['client', 'client_no_access'].includes(u.role)).length}</span> clients</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-primary">{users.filter(u => u.is_active).length}</span> active</span>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 bg-card p-4 rounded-lg border border-border items-center">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        {roleFilterChips && (
          <>
            <FilterChipGroup label="Role">
              {roleFilterChips}
            </FilterChipGroup>
            <Separator orientation="vertical" className="h-8" />
          </>
        )}
        {!isReadOnly && (
          <>
            <FilterChipGroup label="Status">
              <FilterChip label="All" isActive={statusFilter === 'all'} onClick={() => setStatusFilter('all')} size="sm" />
              <FilterChip label="Active" isActive={statusFilter === 'active'} onClick={() => setStatusFilter('active')} size="sm" />
              <FilterChip label="Inactive" isActive={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} size="sm" />
            </FilterChipGroup>
            <Separator orientation="vertical" className="h-8" />
          </>
        )}
        {canInvite && (
          <Button
            size="sm"
            onClick={onInviteUser}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredSortedUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'No users match your filters'
                : 'No users yet'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-background">
                <TableHead className="px-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                  >
                    Name / Email
                    <SortIcon field="name" />
                  </button>
                </TableHead>
                <TableHead className="px-4">
                  <button
                    onClick={() => handleSort('role')}
                    className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                  >
                    Role
                    <SortIcon field="role" />
                  </button>
                </TableHead>
                {isAdminManager && (
                  <TableHead className="px-4">
                    <button
                      onClick={() => handleSort('organization')}
                      className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                    >
                      Organization
                      <SortIcon field="organization" />
                    </button>
                  </TableHead>
                )}
                <TableHead className="px-4">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead className="px-4">
                  <button
                    onClick={() => handleSort('joined')}
                    className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                  >
                    Joined
                    <SortIcon field="joined" />
                  </button>
                </TableHead>
                {!isReadOnly && (
                  <TableHead className="text-right px-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSortedUsers.map(user => (
                <TableRow key={user.id}>
                  {/* Name / Email */}
                  <TableCell className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <HowardAvatar
                        name={user.full_name || user.email}
                        email={user.email}
                        src={user.avatar_url || undefined}
                        role={user.role}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell className="px-4 py-2">
                    <HowardBadge variant={`role-${user.role}` as any}>
                      {user.role}
                    </HowardBadge>
                  </TableCell>

                  {/* Organization — admin/manager only */}
                  {isAdminManager && (
                    <TableCell className="px-4 py-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-1 flex-wrap max-w-[240px] min-h-[32px] px-2 py-1 rounded-md border border-border hover:bg-secondary transition-colors text-left">
                            {user.user_orgs.length > 0 ? (
                              <>
                                {user.user_orgs.map(uo => (
                                  <span
                                    key={uo.org_id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                                  >
                                    {uo.name}
                                    <X
                                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const newOrgIds = user.user_orgs
                                          .filter(o => o.org_id !== uo.org_id)
                                          .map(o => o.org_id)
                                        onUpdateUserOrgs(user.id, newOrgIds)
                                      }}
                                    />
                                  </span>
                                ))}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">No orgs</span>
                            )}
                            <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {organizations.map(org => {
                              const isChecked = user.user_orgs.some(uo => uo.org_id === org.id)
                              return (
                                <label
                                  key={org.id}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => {
                                      const currentOrgIds = user.user_orgs.map(uo => uo.org_id)
                                      const newOrgIds = isChecked
                                        ? currentOrgIds.filter(id => id !== org.id)
                                        : [...currentOrgIds, org.id]
                                      onUpdateUserOrgs(user.id, newOrgIds)
                                    }}
                                  />
                                  {org.name}
                                </label>
                              )
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  )}

                  {/* Status */}
                  <TableCell className="px-4 py-2">
                    <HowardBadge variant={user.is_active ? 'status-active' : 'status-inactive'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </HowardBadge>
                  </TableCell>

                  {/* Joined */}
                  <TableCell className="px-4 py-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  {!isReadOnly && (
                    <TableCell className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {isAdminManager && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditUser(user)}
                              title="Edit user"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {user.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSendMagicLink(user.id, user.email)}
                                title="Send magic link"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeactivateUser(user)}
                              disabled={deletingUserId === user.id}
                              title={user.is_active ? 'Deactivate user' : 'Activate user'}
                            >
                              <Power className={`w-4 h-4 ${user.is_active ? 'text-destructive' : 'text-primary'}`} />
                            </Button>
                          </>
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
    </div>
  )
}
