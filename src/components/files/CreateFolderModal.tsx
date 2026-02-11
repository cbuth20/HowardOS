'use client'

import { useState } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'
import { useCreateChannelFolder } from '@/lib/api/hooks'

interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
  channelId: string
  parentPath: string
  onFolderCreated?: () => void
}

export function CreateFolderModal({
  isOpen,
  onClose,
  channelId,
  parentPath,
  onFolderCreated,
}: CreateFolderModalProps) {
  const [name, setName] = useState('')
  const createFolder = useCreateChannelFolder()

  const handleCreate = async () => {
    if (!name.trim()) return

    try {
      await createFolder.mutateAsync({
        channel_id: channelId,
        name: name.trim(),
        parent_path: parentPath,
      })
      setName('')
      onClose()
      onFolderCreated?.()
    } catch {
      // Error handled by mutation hook
    }
  }

  const handleClose = () => {
    setName('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New folder" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Folder name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter folder name"
            className="w-full px-3 py-2.5 rounded-md border border-neutral-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
          />
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={!name.trim() || createFolder.isPending}
        >
          {createFolder.isPending ? (
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
