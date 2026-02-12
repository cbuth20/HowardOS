'use client'

import { useState, useEffect } from 'react'
import {
  WorkstreamEntryWithDetails,
  WorkstreamVertical,
  User,
  WorkstreamStatus,
  WorkstreamTiming,
} from '@/types/entities'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useSoftwareCatalog } from '@/lib/api/hooks/useSoftwareCatalog'
import { useWorkstreamTemplates } from '@/lib/api/hooks/useWorkstreams'

interface WorkstreamEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  entry?: WorkstreamEntryWithDetails | null
  workstreamId: string
  verticals: WorkstreamVertical[]
  users: User[]
  isSubmitting?: boolean
}

export function WorkstreamEntryModal({
  isOpen,
  onClose,
  onSubmit,
  entry,
  workstreamId,
  verticals,
  users,
  isSubmitting = false,
}: WorkstreamEntryModalProps) {
  const { data: softwareCatalog = [] } = useSoftwareCatalog()
  const { data: templatesData } = useWorkstreamTemplates()
  const templates = (templatesData as any)?.templates || []

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    vertical_id: '',
    timing: '' as WorkstreamTiming | '',
    associated_software: '',
    point_person_id: '',
    status: 'yellow' as WorkstreamStatus,
    notes: '',
  })

  // Populate form when editing
  useEffect(() => {
    if (entry) {
      setFormData({
        name: entry.name || '',
        description: entry.description || '',
        vertical_id: entry.vertical_id || '',
        timing: entry.timing || '',
        associated_software: entry.associated_software || '',
        point_person_id: entry.point_person_id || '',
        status: entry.status || 'yellow',
        notes: entry.notes || '',
      })
    } else {
      // Reset form for create
      setFormData({
        name: '',
        description: '',
        vertical_id: verticals[0]?.id || '',
        timing: '',
        associated_software: '',
        point_person_id: '',
        status: 'yellow',
        notes: '',
      })
    }
  }, [entry, verticals, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      workstream_id: workstreamId,
      name: formData.name,
      description: formData.description || null,
      vertical_id: formData.vertical_id,
      timing: formData.timing || null,
      associated_software: formData.associated_software || null,
      point_person_id: formData.point_person_id || null,
      status: formData.status,
      notes: formData.notes || null,
    }

    onSubmit(payload)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Entry' : 'Create Entry'}</DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
          {/* Template Auto-fill (create mode only) */}
          {!entry && templates.length > 0 && (
            <div className="p-3 bg-secondary/50 rounded-lg border border-border">
              <Label className="mb-1 text-xs font-medium">
                Auto-fill from Template
              </Label>
              <Select
                value="__none__"
                onValueChange={(templateId) => {
                  if (templateId === '__none__') return
                  const tmpl = templates.find((t: any) => t.id === templateId)
                  if (!tmpl) return
                  setFormData((prev) => ({
                    ...prev,
                    name: tmpl.name || prev.name,
                    description: tmpl.description || prev.description,
                    vertical_id: tmpl.vertical_id || prev.vertical_id,
                    timing: tmpl.timing || prev.timing,
                    associated_software: tmpl.associated_software || prev.associated_software,
                  }))
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a template to auto-fill..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Choose a template...</SelectItem>
                  {templates.map((tmpl: any) => (
                    <SelectItem key={tmpl.id} value={tmpl.id}>
                      {tmpl.name}
                      {tmpl.vertical?.name && (
                        <span className="text-muted-foreground ml-1">({tmpl.vertical.name})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div>
            <Label className="mb-1">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Weekly cash flow update"
            />
          </div>

          {/* Vertical */}
          <div>
            <Label className="mb-1">
              Vertical <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.vertical_id || undefined}
              onValueChange={(value) => setFormData({ ...formData, vertical_id: value })}
              required
            >
              <SelectTrigger><SelectValue placeholder="Select a vertical" /></SelectTrigger>
              <SelectContent>
                {verticals.map((vertical) => (
                  <SelectItem key={vertical.id} value={vertical.id}>
                    {vertical.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="mb-1">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe this workstream entry..."
            />
          </div>

          {/* Row: Timing & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1">Timing</Label>
              <Select
                value={formData.timing || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, timing: (value === '__none__' ? '' : value) as WorkstreamTiming | '' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select timing</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="ad-hoc">Ad-hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as WorkstreamStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Active</SelectItem>
                  <SelectItem value="yellow">Resolving</SelectItem>
                  <SelectItem value="red">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Associated Software */}
          <div>
            <Label className="mb-1">
              Associated Software
            </Label>
            <Select
              value={formData.associated_software || '__none__'}
              onValueChange={(value) => setFormData({ ...formData, associated_software: value === '__none__' ? '' : value })}
            >
              <SelectTrigger><SelectValue placeholder="Select software..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {softwareCatalog.map((sw) => (
                  <SelectItem key={sw.id} value={sw.name}>
                    {sw.name}
                    {sw.category && <span className="text-muted-foreground ml-1">({sw.category})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Point Person */}
          <div>
            <Label className="mb-1">Point Person</Label>
            <Select
              value={formData.point_person_id || '__unassigned__'}
              onValueChange={(value) => setFormData({ ...formData, point_person_id: value === '__unassigned__' ? '' : value })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes or context..."
            />
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : entry ? 'Update Entry' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
