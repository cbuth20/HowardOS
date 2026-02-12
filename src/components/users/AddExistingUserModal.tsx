'use client'

import { useState, useMemo } from 'react'
import { Search, Loader2, UserPlus, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HowardAvatar } from '@/components/ui/howard-avatar'
import { HowardBadge } from '@/components/ui/howard-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/utils/auth-fetch'
import { toast } from 'sonner'

interface ExistingUser {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  avatar_url: string | null
  org_id: string
  organizations?: {
    id: string
    name: string
    slug: string
  }
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
  const [confirmMoveUser, setConfirmMoveUser] = useState<ExistingUser | null>(null)

  const supabase = createClient()

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setHasSearched(true)
    try {
      const query = searchQuery.trim().toLowerCase()

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select(`
          id, email, full_name, role, is_active, avatar_url, org_id,
          organizations(id, name, slug)
        `)
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .eq('is_active', true)
        .order('full_name')
        .limit(20)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = (user: ExistingUser) => {
    setConfirmMoveUser(user)
  }

  // Filter out users already in this org
  const filteredUsers = useMemo(() => {
    return users.filter((u) => !currentOrgUserIds.includes(u.id) && u.org_id !== targetOrgId)
  }, [users, currentOrgUserIds, targetOrgId])

  const alreadyInOrgUsers = useMemo(() => {
    return users.filter((u) => currentOrgUserIds.includes(u.id) || u.org_id === targetOrgId)
  }, [users, currentOrgUserIds, targetOrgId])

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
            This will move them from their current organization.
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
                        <div className="flex items-center gap-2 mt-0.5">
                          <HowardBadge variant={`role-${user.role}` as any}>
                            {user.role}
                          </HowardBadge>
                          {user.organizations && (
                            <span className="text-xs text-muted-foreground">
                              {user.organizations.name}
                            </span>
                          )}
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
                          <ArrowRight className="w-4 h-4 mr-1" />
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

      {/* Move User Confirmation */}
      <ConfirmDialog
        open={!!confirmMoveUser}
        onOpenChange={(open) => { if (!open) setConfirmMoveUser(null) }}
        title="Move User"
        description={
          confirmMoveUser
            ? `Move ${confirmMoveUser.full_name || confirmMoveUser.email} from "${confirmMoveUser.organizations?.name || 'Unknown'}" to "${targetOrgName}"?`
            : ''
        }
        confirmLabel="Move"
        variant="default"
        onConfirm={async () => {
          if (!confirmMoveUser) return
          const user = confirmMoveUser
          setConfirmMoveUser(null)

          setAddingUserId(user.id)
          try {
            // Use API to bypass RLS (admin updating another user's profile)
            const response = await authFetch(`/api/users-update-profile?id=${user.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ org_id: targetOrgId }),
            })

            if (!response.ok) {
              const data = await response.json()
              throw new Error(data.error || 'Failed to update user')
            }

            toast.success(`${user.full_name || user.email} added to ${targetOrgName}`)
            // Remove from search results
            setUsers((prev) => prev.filter((u) => u.id !== user.id))
            onComplete()
          } catch (error: any) {
            console.error('Error adding user:', error)
            toast.error(error.message || 'Failed to add user')
          } finally {
            setAddingUserId(null)
          }
        }}
      />
    </Dialog>
  )
}
