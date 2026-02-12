'use client'

import { useState, useEffect } from 'react'
import { useWorkstreamVerticals, useCreateWorkstreamTemplate, useUpdateWorkstreamTemplate } from '@/lib/api/hooks/useWorkstreams'
import { WorkstreamTemplateWithVertical, WorkstreamTiming } from '@/types/entities'
import { CreateWorkstreamTemplateInput } from '@/types/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useSoftwareCatalog } from '@/lib/api/hooks/useSoftwareCatalog'

interface WorkstreamTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  template?: WorkstreamTemplateWithVertical | null
}

const timingOptions: { value: WorkstreamTiming; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'ad-hoc', label: 'Ad-hoc' },
]

export function WorkstreamTemplateModal({ isOpen, onClose, template }: WorkstreamTemplateModalProps) {
  const { data: verticals = [], isLoading: loadingVerticals } = useWorkstreamVerticals()
  const createMutation = useCreateWorkstreamTemplate()
  const updateMutation = useUpdateWorkstreamTemplate()

  const { data: softwareCatalog = [] } = useSoftwareCatalog()

  const [formData, setFormData] = useState<CreateWorkstreamTemplateInput>({
    vertical_id: '',
    name: '',
    description: '',
    associated_software: '',
    timing: null,
    display_order: 0,
  })

  // Populate form when editing
  useEffect(() => {
    if (template) {
      setFormData({
        vertical_id: template.vertical_id,
        name: template.name,
        description: template.description || '',
        associated_software: template.associated_software || '',
        timing: template.timing as WorkstreamTiming | null,
        display_order: template.display_order,
      })
    } else {
      setFormData({
        vertical_id: '',
        name: '',
        description: '',
        associated_software: '',
        timing: null,
        display_order: 0,
      })
    }
  }, [template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (template) {
        await updateMutation.mutateAsync({ id: template.id, data: formData })
      } else {
        await createMutation.mutateAsync(formData)
      }
      onClose()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vertical Selection */}
          <div>
            <Label className="mb-1">
              Vertical <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.vertical_id || undefined}
              onValueChange={(value) => setFormData({ ...formData, vertical_id: value })}
              required
              disabled={loadingVerticals || isLoading}
            >
              <SelectTrigger><SelectValue placeholder="Select a vertical..." /></SelectTrigger>
              <SelectContent>
                {verticals.map((vertical) => (
                  <SelectItem key={vertical.id} value={vertical.id}>
                    {vertical.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div>
            <Label className="mb-1">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Bank Reconciliation"
              required
              maxLength={200}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <Label className="mb-1">
              Description
            </Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this workstream..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Associated Software */}
          <div>
            <Label className="mb-1">
              Associated Software
            </Label>
            <Select
              value={formData.associated_software || '__none__'}
              onValueChange={(value) => setFormData({ ...formData, associated_software: value === '__none__' ? '' : value })}
              disabled={isLoading}
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

          {/* Timing */}
          <div>
            <Label className="mb-1">
              Timing
            </Label>
            <Select
              value={formData.timing || '__none__'}
              onValueChange={(value) => setFormData({ ...formData, timing: (value === '__none__' ? null : value) as WorkstreamTiming | null })}
              disabled={isLoading}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select timing...</SelectItem>
                {timingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Display Order */}
          <div>
            <Label className="mb-1">
              Display Order
            </Label>
            <Input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              min={0}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower numbers appear first
            </p>
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
              {isLoading ? 'Saving...' : template ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
