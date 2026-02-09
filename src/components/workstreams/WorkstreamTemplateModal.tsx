'use client'

import { useState, useEffect } from 'react'
import { useWorkstreamVerticals, useCreateWorkstreamTemplate, useUpdateWorkstreamTemplate } from '@/lib/api/hooks/useWorkstreams'
import { WorkstreamTemplateWithVertical, WorkstreamTiming } from '@/types/entities'
import { CreateWorkstreamTemplateInput } from '@/types/schemas'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={template ? 'Edit Template' : 'Create Template'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vertical Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vertical <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.vertical_id}
              onChange={(e) => setFormData({ ...formData, vertical_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
              disabled={loadingVerticals || isLoading}
            >
              <option value="">Select a vertical...</option>
              {verticals.map((vertical) => (
                <option key={vertical.id} value={vertical.id}>
                  {vertical.name}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., Bank Reconciliation"
              required
              maxLength={200}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Brief description of this workstream..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Associated Software */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Associated Software
            </label>
            <input
              type="text"
              value={formData.associated_software || ''}
              onChange={(e) => setFormData({ ...formData, associated_software: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., QuickBooks, Excel, NetSuite"
              disabled={isLoading}
            />
          </div>

          {/* Timing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timing
            </label>
            <select
              value={formData.timing || ''}
              onChange={(e) => setFormData({ ...formData, timing: (e.target.value || null) as WorkstreamTiming | null })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              disabled={isLoading}
            >
              <option value="">Select timing...</option>
              {timingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Order
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              min="0"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first
            </p>
          </div>

        {/* Actions */}
        <ModalFooter>
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : template ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
