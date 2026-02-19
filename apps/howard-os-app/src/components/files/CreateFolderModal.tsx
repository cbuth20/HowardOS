'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@howard/ui/components/ui/dialog'
import { Button } from '@howard/ui/components/ui/button'
import { Input } from '@howard/ui/components/ui/input'
import { Label } from '@howard/ui/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useCreateChannelFolder } from '@howard/ui/lib/api/hooks'

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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5">
              Folder name
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
