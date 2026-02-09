'use client'

import { useState, useEffect } from 'react'
import { useAssignWorkstream } from '@/lib/api/hooks/useWorkstreams'
import { WorkstreamTemplateWithVertical, WorkstreamStatus } from '@/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Workstream: ${template.name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Organization <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.org_id}
              onChange={(e) =>
                setFormData({ ...formData, org_id: e.target.value, point_person_id: '' })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
              disabled={isLoading}
            >
              <option value="">Select an organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Status <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={formData.status === option.value}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as WorkstreamStatus })
                    }
                    className="h-4 w-4 text-blue-600"
                    disabled={isLoading}
                  />
                  <WorkstreamStatusBadge status={option.value} size="md" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Point Person Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Point Person (Optional)
            </label>
            <select
              value={formData.point_person_id}
              onChange={(e) => setFormData({ ...formData, point_person_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
              disabled={!formData.org_id || isLoading}
            >
              <option value="">No point person</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.id}
                </option>
              ))}
            </select>
            {!formData.org_id && (
              <p className="text-xs text-gray-500 mt-1">
                Select an organization first
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Add any notes about this assignment..."
              rows={3}
              disabled={isLoading}
            />
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
            {isLoading ? 'Assigning...' : 'Assign Workstream'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
