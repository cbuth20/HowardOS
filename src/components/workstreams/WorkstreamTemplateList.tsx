'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useWorkstreamTemplates, useWorkstreamVerticals, useDeleteWorkstreamTemplate } from '@/lib/api/hooks/useWorkstreams'
import { WorkstreamTemplateWithVertical } from '@/types/entities'
import { WorkstreamTemplateModal } from './WorkstreamTemplateModal'
import { Button } from '@/components/ui/Button'

export function WorkstreamTemplateList() {
  const [showModal, setShowModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkstreamTemplateWithVertical | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVertical, setSelectedVertical] = useState<string>('')
  const [expandedVerticals, setExpandedVerticals] = useState<Set<string>>(new Set())

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

  const toggleVertical = (verticalId: string) => {
    setExpandedVerticals((prev) => {
      const next = new Set(prev)
      if (next.has(verticalId)) {
        next.delete(verticalId)
      } else {
        next.add(verticalId)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (expandedVerticals.size === verticals.length) {
      setExpandedVerticals(new Set())
    } else {
      setExpandedVerticals(new Set(verticals.map((v) => v.id)))
    }
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
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <select
          value={selectedVertical}
          onChange={(e) => setSelectedVertical(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          <option value="">All Verticals</option>
          {verticals.map((vertical) => (
            <option key={vertical.id} value={vertical.id}>
              {vertical.name}
            </option>
          ))}
        </select>
        <Button onClick={toggleAll} variant="outline" size="sm">
          {expandedVerticals.size === verticals.length ? 'Collapse All' : 'Expand All'}
        </Button>
        <Button onClick={handleCreate} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grouped by Vertical */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          <p className="font-medium">No templates found</p>
          <Button
            onClick={handleCreate}
            variant="primary"
            className="mt-4"
          >
            Create your first template
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {verticals
            .filter((v) => templatesByVertical[v.id]?.length > 0)
            .map((vertical) => {
              const isExpanded = expandedVerticals.has(vertical.id)
              const verticalTemplates = templatesByVertical[vertical.id] || []

              return (
                <div key={vertical.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Vertical Header */}
                  <button
                    onClick={() => toggleVertical(vertical.id)}
                    className="w-full bg-gray-50 hover:bg-gray-100 transition-colors px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <div
                        className="h-6 w-1 rounded"
                        style={{ backgroundColor: vertical.color || '#3B82F6' }}
                      />
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900">{vertical.name}</h4>
                        <p className="text-xs text-gray-500">{vertical.description}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 font-medium">
                      {verticalTemplates.length} template{verticalTemplates.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Templates Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white border-t border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Timing
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Software
                            </th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {verticalTemplates.map((template) => (
                            <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 text-sm">
                                  {template.name}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-600 line-clamp-2 max-w-md">
                                  {template.description || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {template.timing ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {template.timing}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {template.associated_software ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    {template.associated_software}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleEdit(template)}
                                    className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                                    title="Edit template"
                                  >
                                    <Edit className="h-4 w-4 text-gray-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(template)}
                                    className="p-1.5 rounded hover:bg-red-50 transition-colors"
                                    title="Delete template"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {/* Summary */}
      {templates.length > 0 && (
        <div className="text-sm text-gray-600 pt-2">
          Showing <span className="font-semibold text-gray-900">{templates.length}</span> template
          {templates.length !== 1 ? 's' : ''} across{' '}
          <span className="font-semibold text-gray-900">
            {Object.keys(templatesByVertical).length}
          </span>{' '}
          vertical{Object.keys(templatesByVertical).length !== 1 ? 's' : ''}
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
