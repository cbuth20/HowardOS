'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@howard/ui/components/ui/dialog'
import { Button } from '@howard/ui/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@howard/ui/components/ui/select'
import { Label } from '@howard/ui/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useClients } from '@howard/ui/lib/api/hooks'
import { useCreateFileChannel } from '@howard/ui/lib/api/hooks'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onChannelCreated?: (channelId: string) => void
}

export function CreateChannelModal({ isOpen, onClose, onChannelCreated }: CreateChannelModalProps) {
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const { data: clientsData, isLoading: loadingClients } = useClients({ enabled: isOpen })
  const createChannel = useCreateFileChannel()

  // Get unique organizations from clients
  const organizations = useMemo(() => {
    if (!clientsData?.clients) return []
    const orgMap = new Map<string, { id: string; name: string }>()
    for (const client of clientsData.clients) {
      const org = (client as any).organizations
      if (org && !orgMap.has(org.id)) {
        orgMap.set(org.id, { id: org.id, name: org.name })
      }
    }
    return Array.from(orgMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [clientsData])

  const handleCreate = async () => {
    if (!selectedOrgId) return

    try {
      const result = await createChannel.mutateAsync({ client_org_id: selectedOrgId })
      setSelectedOrgId('')
      onClose()
      onChannelCreated?.(result.channel.id)
    } catch {
      // Error handled by mutation hook
    }
  }

  const handleClose = () => {
    setSelectedOrgId('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create channel</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create a channel where all recipients can see uploaded files.
          </p>

          {loadingClients ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div>
              <Label className="mb-1.5">
                Select client or company
              </Label>
              <Select
                value={selectedOrgId || undefined}
                onValueChange={(value) => setSelectedOrgId(value)}
              >
                <SelectTrigger><SelectValue placeholder="Select clients or company" /></SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Discard
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedOrgId || createChannel.isPending}
          >
            {createChannel.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
