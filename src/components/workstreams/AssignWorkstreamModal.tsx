'use client'

import { useState, useEffect } from 'react'
import { useAssignWorkstream } from '@/lib/api/hooks/useWorkstreams'
import { WorkstreamTemplateWithVertical, WorkstreamStatus } from '@/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface AssignWorkstreamModalProps {
  isOpen: boolean
  onClose: () => void
  template: WorkstreamTemplateWithVertical | null
  organizations: Array<{ id: string; name: string }>
  users: Array<{ id: string; full_name: string | null; org_id: string }>
}

const statusOptions: { value: WorkstreamStatus; label: string; description: string }[] = [
  { value: 'red', label: 'Red', description: 'Issues/Blocked' },
  { value: 'yellow', label: 'Yellow', description: 'In Progress' },
  { value: 'green', label: 'Green', description: 'On Track' },
]

export function AssignWorkstreamModal({
  isOpen,
  onClose,
  template,
  organizations,
  users,
}: AssignWorkstreamModalProps) {
  const assignMutation = useAssignWorkstream()

  const [formData, setFormData] = useState({
    org_id: '',
    status: 'yellow' as WorkstreamStatus,
    point_person_id: '',
    notes: '',
  })

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        org_id: '',
        status: 'yellow',
        point_person_id: '',
        notes: '',
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!template) return

    try {
      await assignMutation.mutateAsync({
        template_id: template.id,
        org_id: formData.org_id,
        status: formData.status,
        point_person_id: formData.point_person_id || null,
        notes: formData.notes || null,
      })
      onClose()
    } catch (error) {
      // Error handled by mutation
    }
  }

  if (!template) return null

  // Filter users by selected organization
  const availableUsers = formData.org_id
    ? users.filter((user) => user.org_id === formData.org_id)
    : []

  const isLoading = assignMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Workstream: {template.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Selection */}
          <div>
            <Label className="mb-1">
              Client Organization <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.org_id || undefined}
              onValueChange={(value) =>
                setFormData({ ...formData, org_id: value, point_person_id: '' })
              }
              disabled={isLoading}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an organization..." />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Selection */}
          <div>
            <Label className="mb-2">
              Initial Status <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary"
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={formData.status === option.value}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as WorkstreamStatus })
                    }
                    className="h-4 w-4 text-primary"
                    disabled={isLoading}
                  />
                  <WorkstreamStatusBadge status={option.value} size="md" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Point Person Selection */}
          <div>
            <Label className="mb-1">
              Point Person (Optional)
            </Label>
            <Select
              value={formData.point_person_id || '__none__'}
              onValueChange={(value) => setFormData({ ...formData, point_person_id: value === '__none__' ? '' : value })}
              disabled={!formData.org_id || isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No point person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No point person</SelectItem>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!formData.org_id && (
              <p className="text-xs text-muted-foreground mt-1">
                Select an organization first
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1">
              Notes (Optional)
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes about this assignment..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Assigning...' : 'Assign Workstream'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
