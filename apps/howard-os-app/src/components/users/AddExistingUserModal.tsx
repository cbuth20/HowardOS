'use client'

import { useState, useMemo } from 'react'
import { Search, Loader2, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@howard/ui/components/ui/dialog'
import { Button } from '@howard/ui/components/ui/button'
import { Input } from '@howard/ui/components/ui/input'
import { HowardAvatar } from '@howard/ui/components/ui/howard-avatar'
import { HowardBadge } from '@howard/ui/components/ui/howard-badge'
import { createClient } from '@howard/ui/lib/supabase/client'
import { toast } from 'sonner'

interface UserOrg {
  org_id: string
  name: string
}

interface ExistingUser {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  avatar_url: string | null
  org_id: string
  user_orgs: UserOrg[]
}

interface AddExistingUserModalProps {
  isOpen: boolean
  onClose: () => void
  targetOrgId: string
  targetOrgName: string
  currentOrgUserIds: string[]
  onComplete: () => void
}

export function AddExistingUserModal({
  isOpen,
  onClose,
  targetOrgId,
  targetOrgName,
  currentOrgUserIds,
  onComplete,
}: AddExistingUserModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<ExistingUser[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)

  const supabase = createClient()

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setHasSearched(true)
    try {
      const query = searchQuery.trim().toLowerCase()

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select(`id, email, full_name, role, is_active, avatar_url, org_id`)
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .eq('is_active', true)
        .order('full_name')
        .limit(20)

      if (error) throw error

      // Fetch user_organizations for these users
      const userIds = (data || []).map((u: any) => u.id)
      let userOrgsMap: Record<string, UserOrg[]> = {}

      if (userIds.length > 0) {
        const { data: uoData } = await (supabase as any)
          .from('user_organizations')
          .select('user_id, org_id, organization:organizations(id, name)')
          .in('user_id', userIds)

        if (uoData) {
          for (const uo of uoData) {
            if (!userOrgsMap[uo.user_id]) userOrgsMap[uo.user_id] = []
            userOrgsMap[uo.user_id].push({
              org_id: uo.org_id,
              name: uo.organization?.name || 'Unknown',
            })
          }
        }
      }

      const usersWithOrgs = (data || []).map((u: any) => ({
        ...u,
        user_orgs: userOrgsMap[u.id] || [],
      }))

      setUsers(usersWithOrgs)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (user: ExistingUser) => {
    setAddingUserId(user.id)
    try {
      const { error } = await (supabase as any)
        .from('user_organizations')
        .insert({ user_id: user.id, org_id: targetOrgId, is_primary: false })

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already a member of this organization')
        } else {
          throw error
        }
      } else {
        toast.success(`${user.full_name || user.email} added to ${targetOrgName}`)
        setUsers((prev) => prev.filter((u) => u.id !== user.id))
        onComplete()
      }
    } catch (error: any) {
      console.error('Error adding user:', error)
      toast.error(error.message || 'Failed to add user')
    } finally {
      setAddingUserId(null)
    }
  }

  // Filter out users already in this org
  const filteredUsers = useMemo(() => {
    return users.filter((u) => !currentOrgUserIds.includes(u.id))
  }, [users, currentOrgUserIds])

  const alreadyInOrgUsers = useMemo(() => {
    return users.filter((u) => currentOrgUserIds.includes(u.id))
  }, [users, currentOrgUserIds])

  const handleClose = () => {
    setSearchQuery('')
    setUsers([])
    setHasSearched(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add existing user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Search for an existing user to add to <span className="font-medium text-foreground">{targetOrgName}</span>.
            Users can belong to multiple organizations.
          </p>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                placeholder="Search by name or email..."
                className="pl-9"
                autoFocus
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : hasSearched && filteredUsers.length === 0 && alreadyInOrgUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No users found matching &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <HowardAvatar
                        name={user.full_name || user.email}
                        email={user.email}
                        src={user.avatar_url || undefined}
                        role={user.role}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <HowardBadge variant={`role-${user.role}` as any}>
                            {user.role}
                          </HowardBadge>
                          {user.user_orgs.map(uo => (
                            <span
                              key={uo.org_id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
                            >
                              {uo.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddUser(user)}
                      disabled={addingUserId === user.id}
                    >
                      {addingUserId === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                ))}

                {alreadyInOrgUsers.length > 0 && (
                  <>
                    {filteredUsers.length > 0 && (
                      <div className="border-t border-border my-2" />
                    )}
                    {alreadyInOrgUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg opacity-50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <HowardAvatar
                            name={user.full_name || user.email}
                            email={user.email}
                            src={user.avatar_url || undefined}
                            role={user.role}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {user.full_name || user.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">
                          Already in org
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>

    </Dialog>
  )
}
