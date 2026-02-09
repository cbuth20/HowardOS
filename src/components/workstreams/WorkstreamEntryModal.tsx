'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  WorkstreamEntryWithDetails,
  WorkstreamVertical,
  User,
  WorkstreamStatus,
  WorkstreamTiming,
} from '@/types/entities'

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {entry ? 'Edit Entry' : 'Create Entry'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="e.g., Weekly cash flow update"
            />
          </div>

          {/* Vertical */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vertical <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.vertical_id}
              onChange={(e) => setFormData({ ...formData, vertical_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="">Select a vertical</option>
              {verticals.map((vertical) => (
                <option key={vertical.id} value={vertical.id}>
                  {vertical.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="Describe this workstream entry..."
            />
          </div>

          {/* Row: Timing & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timing</label>
              <select
                value={formData.timing}
                onChange={(e) => setFormData({ ...formData, timing: e.target.value as WorkstreamTiming })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              >
                <option value="">Select timing</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="ad-hoc">Ad-hoc</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as WorkstreamStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              >
                <option value="green">🟢 On Track</option>
                <option value="yellow">🟡 In Progress</option>
                <option value="red">🔴 Blocked</option>
              </select>
            </div>
          </div>

          {/* Associated Software */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Associated Software
            </label>
            <input
              type="text"
              value={formData.associated_software}
              onChange={(e) => setFormData({ ...formData, associated_software: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="e.g., QuickBooks, Excel"
            />
          </div>

          {/* Point Person */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Point Person</label>
            <select
              value={formData.point_person_id}
              onChange={(e) => setFormData({ ...formData, point_person_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="Additional notes or context..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : entry ? 'Update Entry' : 'Create Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
