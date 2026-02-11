'use client'

import { useState, useMemo } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'
import { useClients } from '@/lib/api/hooks'
import { useCreateFileChannel } from '@/lib/api/hooks'

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
    <Modal isOpen={isOpen} onClose={handleClose} title="Create channel" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Create a channel where all recipients can see uploaded files.
        </p>

        {loadingClients ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Select client or company
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-neutral-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="">Select clients or company</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Discard
        </Button>
        <Button
          variant="primary"
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
      </ModalFooter>
    </Modal>
  )
}
