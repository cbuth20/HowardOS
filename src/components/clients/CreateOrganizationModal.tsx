'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface CreateOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function CreateOrganizationModal({ isOpen, onClose, onComplete }: CreateOrganizationModalProps) {
  const [newOrgName, setNewOrgName] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const supabase = createClient()

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) {
      toast.error('Organization name is required')
      return
    }

    setCreatingOrg(true)
    try {
      const slug = newOrgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const { error } = await (supabase as any)
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          slug: slug,
        })

      if (error) throw error

      toast.success('Organization created successfully')
      setNewOrgName('')
      onComplete()
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast.error(error.message || 'Failed to create organization')
    } finally {
      setCreatingOrg(false)
    }
  }

  const handleClose = () => {
    setNewOrgName('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <div>
            <Label htmlFor="orgName" className="mb-2">
              Organization Name *
            </Label>
            <Input
              id="orgName"
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              required
              disabled={creatingOrg}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be the client organization name
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={creatingOrg}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creatingOrg || !newOrgName.trim()}
            >
              {creatingOrg ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Create Organization
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
