'use client'

import { useState, useMemo } from 'react'
import { Search, Loader2, UserPlus, ArrowRight } from 'lucide-react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface ExistingUser {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'client'
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

  const handleAddUser = async (user: ExistingUser) => {
    if (!confirm(
      `Move ${user.full_name || user.email} from "${user.organizations?.name || 'Unknown'}" to "${targetOrgName}"?`
    )) {
      return
    }

    setAddingUserId(user.id)
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ org_id: targetOrgId })
        .eq('id', user.id)

      if (error) throw error

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
    <Modal isOpen={isOpen} onClose={handleClose} title="Add existing user" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Search for an existing user to add to <span className="font-medium text-text-primary">{targetOrgName}</span>.
          This will move them from their current organization.
        </p>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2.5 rounded-md border border-neutral-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
              autoFocus
            />
          </div>
          <Button
            variant="primary"
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
              <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
            </div>
          ) : hasSearched && filteredUsers.length === 0 && alreadyInOrgUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-text-muted">No users found matching &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-background-hover transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar
                      name={user.full_name || user.email}
                      email={user.email}
                      src={user.avatar_url || undefined}
                      role={user.role}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            user.role === 'admin'
                              ? 'bg-brand-navy/10 text-brand-navy'
                              : 'bg-brand-slate/10 text-brand-slate'
                          }`}
                        >
                          {user.role}
                        </span>
                        {user.organizations && (
                          <span className="text-xs text-text-muted">
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
                    <div className="border-t border-neutral-border my-2" />
                  )}
                  {alreadyInOrgUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg opacity-50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar
                          name={user.full_name || user.email}
                          email={user.email}
                          src={user.avatar_url || undefined}
                          role={user.role}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-xs text-text-muted truncate">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-text-muted px-2 py-1 bg-background-elevated rounded">
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

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Done
        </Button>
      </ModalFooter>
    </Modal>
  )
}
