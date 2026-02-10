'use client'

import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { WorkstreamTemplateWithVertical, WorkstreamVertical } from '@/types/entities'
import { useWorkstreamTemplates, useWorkstreamVerticals } from '@/lib/api/hooks'

interface BulkAddEntriesModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (templateIds: string[]) => void
  workstreamId: string
  isSubmitting?: boolean
}

export function BulkAddEntriesModal({
  isOpen,
  onClose,
  onSubmit,
  workstreamId,
  isSubmitting = false,
}: BulkAddEntriesModalProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVertical, setFilterVertical] = useState('')

  // Fetch templates and verticals
  const { data: templates = [], isLoading: loadingTemplates } = useWorkstreamTemplates({
    is_active: true,
  })
  const { data: verticals = [] } = useWorkstreamVerticals()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplates(new Set())
      setSearchQuery('')
      setFilterVertical('')
    }
  }, [isOpen])

  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const filteredIds = filteredTemplates.map((t) => t.id)
    setSelectedTemplates(new Set(filteredIds))
  }

  const handleDeselectAll = () => {
    setSelectedTemplates(new Set())
  }

  const handleSubmit = () => {
    if (selectedTemplates.size === 0) return
    onSubmit(Array.from(selectedTemplates))
  }

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    // Filter by vertical
    if (filterVertical && template.vertical_id !== filterVertical) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.vertical?.name.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Group templates by vertical
  const templatesByVertical = filteredTemplates.reduce((acc, template) => {
    const verticalId = template.vertical_id || 'uncategorized'
    if (!acc[verticalId]) acc[verticalId] = []
    acc[verticalId].push(template)
    return acc
  }, {} as Record<string, WorkstreamTemplateWithVertical[]>)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Entries from Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedTemplates.size} template{selectedTemplates.size !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>

          {/* Vertical Filter & Actions */}
          <div className="flex items-center gap-3">
            <select
              value={filterVertical}
              onChange={(e) => setFilterVertical(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="">All Verticals</option>
              {verticals.map((vertical) => (
                <option key={vertical.id} value={vertical.id}>
                  {vertical.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-2 text-sm text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
            >
              Select All
            </button>

            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loadingTemplates ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No templates found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {verticals
                .filter((v) => templatesByVertical[v.id]?.length > 0)
                .map((vertical) => (
                  <div key={vertical.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="h-1 w-8 rounded"
                        style={{ backgroundColor: vertical.color || '#3B82F6' }}
                      />
                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        {vertical.name}
                      </h4>
                      <span className="text-xs text-gray-500">
                        ({templatesByVertical[vertical.id].length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {templatesByVertical[vertical.id].map((template: WorkstreamTemplateWithVertical) => (
                        <label
                          key={template.id}
                          className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTemplates.has(template.id)}
                            onChange={() => handleToggleTemplate(template.id)}
                            className="mt-1 h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              {template.timing && (
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                  {template.timing}
                                </span>
                              )}
                            </div>

                            {template.description && (
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            )}

                            {template.associated_software && (
                              <p className="text-xs text-gray-500 mt-1">
                                Software: {template.associated_software}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

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
            disabled={isSubmitting || selectedTemplates.size === 0}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? 'Adding...'
              : `Add ${selectedTemplates.size} Entr${selectedTemplates.size !== 1 ? 'ies' : 'y'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
