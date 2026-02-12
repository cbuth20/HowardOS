'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HowardAvatar } from '@/components/ui/howard-avatar'
import { Share2, Check } from 'lucide-react'
import { authFetch } from '@/lib/utils/auth-fetch'
import { toast } from 'sonner'

interface Client {
  id: string
  email: string
  full_name: string
  org_name: string
}

interface ShareFileModalProps {
  isOpen: boolean
  onClose: () => void
  fileId: string
  fileName: string
  onShareComplete?: () => void
}

export function ShareFileModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  onShareComplete,
}: ShareFileModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [clientsByOrg, setClientsByOrg] = useState<Record<string, Client[]>>({})
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      fetchCurrentShares()
    }
  }, [isOpen, fileId])

  const fetchClients = async () => {
    try {
      const response = await authFetch('/api/users-clients')
      if (!response.ok) throw new Error('Failed to fetch clients')

      const data = await response.json()
      setClients(data.clients || [])
      setClientsByOrg(data.clientsByOrg || {})
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentShares = async () => {
    try {
      const response = await authFetch(`/api/files-share?fileId=${fileId}`)
      if (!response.ok) throw new Error('Failed to fetch shares')

      const data = await response.json()
      const sharedUserIds = new Set<string>(
        data.permissions?.map((p: any) => p.user_id) || []
      )
      setSelectedUserIds(sharedUserIds)
    } catch (error) {
      console.error('Error fetching shares:', error)
    }
  }

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }

  const toggleOrg = (orgName: string) => {
    const orgClients = clientsByOrg[orgName] || []
    const allSelected = orgClients.every(c => selectedUserIds.has(c.id))

    const newSelected = new Set(selectedUserIds)
    orgClients.forEach(client => {
      if (allSelected) {
        newSelected.delete(client.id)
      } else {
        newSelected.add(client.id)
      }
    })
    setSelectedUserIds(newSelected)
  }

  const handleShare = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one client')
      return
    }

    setSharing(true)
    try {
      const response = await authFetch('/api/files-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          userIds: Array.from(selectedUserIds),
          permission: 'view',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to share file')
      }

      toast.success(`File shared with ${selectedUserIds.size} client(s)`)
      onShareComplete?.()
      onClose()
    } catch (error: any) {
      console.error('Share error:', error)
      toast.error(error.message || 'Failed to share file')
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Share File</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* File Info */}
          <div className="p-4 bg-secondary rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Sharing</p>
            <p className="font-medium text-foreground">{fileName}</p>
          </div>

          {/* Selected Count */}
          <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <span className="text-sm font-medium text-foreground">
              {selectedUserIds.size} client(s) selected
            </span>
            {selectedUserIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUserIds(new Set())}
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Clients List */}
          <div className="max-h-96 overflow-y-auto space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground text-sm mt-2">Loading clients...</p>
              </div>
            ) : Object.keys(clientsByOrg).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No client users found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create test clients first
                </p>
              </div>
            ) : (
              Object.entries(clientsByOrg).map(([orgName, orgClients]) => {
                const allSelected = orgClients.every(c => selectedUserIds.has(c.id))
                const someSelected = orgClients.some(c => selectedUserIds.has(c.id))

                return (
                  <div key={orgName} className="border border-border rounded-lg overflow-hidden shadow-sm">
                    {/* Organization Header */}
                    <button
                      onClick={() => toggleOrg(orgName)}
                      className="w-full p-3 bg-secondary hover:bg-muted transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            allSelected
                              ? 'bg-primary border-primary'
                              : someSelected
                              ? 'bg-primary/50 border-primary'
                              : 'border-border bg-card'
                          }`}
                        >
                          {(allSelected || someSelected) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="font-semibold text-foreground">{orgName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {orgClients.length} user{orgClients.length !== 1 && 's'}
                      </span>
                    </button>

                    {/* Organization Users */}
                    <div className="divide-y divide-border bg-card">
                      {orgClients.map(client => {
                        const isSelected = selectedUserIds.has(client.id)
                        return (
                          <button
                            key={client.id}
                            onClick={() => toggleUser(client.id)}
                            className="w-full p-3 hover:bg-secondary transition-colors flex items-center gap-3"
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-primary border-primary'
                                  : 'border-border bg-card'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <HowardAvatar
                              name={client.full_name || client.email}
                              email={client.email}
                              role="client"
                              size="sm"
                            />
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {client.full_name || client.email}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>

        </div>

        {/* Actions */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sharing}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={sharing || selectedUserIds.size === 0}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {sharing ? 'Sharing...' : `Share with ${selectedUserIds.size} client(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
