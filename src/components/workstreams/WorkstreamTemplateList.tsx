'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Users } from 'lucide-react'
import { useWorkstreamTemplates, useWorkstreamVerticals, useDeleteWorkstreamTemplate } from '@/lib/api/hooks/useWorkstreams'
import { WorkstreamTemplateWithVertical } from '@/types/entities'
import { WorkstreamTemplateModal } from './WorkstreamTemplateModal'
import { Button } from '@/components/ui/Button'

interface WorkstreamTemplateListProps {
  onAssignClick: (template: WorkstreamTemplateWithVertical) => void
}

export function WorkstreamTemplateList({ onAssignClick }: WorkstreamTemplateListProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkstreamTemplateWithVertical | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVertical, setSelectedVertical] = useState<string>('')

  const { data: templates = [], isLoading } = useWorkstreamTemplates({
    is_active: true,
    search: searchQuery || undefined,
    vertical_id: selectedVertical || undefined,
  })
  const { data: verticals = [] } = useWorkstreamVerticals()
  const deleteMutation = useDeleteWorkstreamTemplate()

  const handleEdit = (template: WorkstreamTemplateWithVertical) => {
    setSelectedTemplate(template)
    setShowModal(true)
  }

  const handleDelete = async (template: WorkstreamTemplateWithVertical) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return
    await deleteMutation.mutateAsync(template.id)
  }

  const handleCreate = () => {
    setSelectedTemplate(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedTemplate(null)
  }

  // Group templates by vertical
  const templatesByVertical = templates.reduce((acc, template) => {
    const verticalId = template.vertical_id
    if (!acc[verticalId]) acc[verticalId] = []
    acc[verticalId].push(template)
    return acc
  }, {} as Record<string, WorkstreamTemplateWithVertical[]>)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-3" />
            <div className="space-y-2">
              <div className="h-20 bg-gray-100 rounded" />
              <div className="h-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={selectedVertical}
          onChange={(e) => setSelectedVertical(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Verticals</option>
          {verticals.map((vertical) => (
            <option key={vertical.id} value={vertical.id}>
              {vertical.name}
            </option>
          ))}
        </select>
        <Button onClick={handleCreate} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grouped by Vertical */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No templates found</p>
          <Button
            onClick={handleCreate}
            variant="primary"
            className="mt-4"
          >
            Create your first template
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {verticals
            .filter((v) => templatesByVertical[v.id]?.length > 0)
            .map((vertical) => (
              <div key={vertical.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="h-1 w-12 rounded"
                    style={{ backgroundColor: vertical.color || '#3B82F6' }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {vertical.name}
                  </h3>
                  <span className="text-sm text-gray-500">
                    ({templatesByVertical[vertical.id].length})
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {templatesByVertical[vertical.id].map((template: WorkstreamTemplateWithVertical) => (
                    <div
                      key={template.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex-1">
                          {template.name}
                        </h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(template)}
                            className="rounded p-1 hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(template)}
                            className="rounded p-1 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </div>

                      {template.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3 text-xs">
                        {template.timing && (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                            {template.timing}
                          </span>
                        )}
                        {template.associated_software && (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                            {template.associated_software}
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={() => onAssignClick(template)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Assign to Clients
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Template Modal */}
      <WorkstreamTemplateModal
        isOpen={showModal}
        onClose={handleCloseModal}
        template={selectedTemplate}
      />
    </div>
  )
}
