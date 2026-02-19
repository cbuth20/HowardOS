'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Search, Clock, Package } from 'lucide-react'
import { useWorkstreamTemplates, useWorkstreamVerticals, useDeleteWorkstreamTemplate } from '@howard/ui/lib/api/hooks/useWorkstreams'
import { WorkstreamTemplateWithVertical } from '@howard/ui/types/entities'
import { WorkstreamTemplateModal } from './WorkstreamTemplateModal'
import { ConfirmDialog } from '@howard/ui/components/ui/confirm-dialog'
import { Button } from '@howard/ui/components/ui/button'
import { Input } from '@howard/ui/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@howard/ui/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@howard/ui/components/ui/accordion'
import { Card } from '@howard/ui/components/ui/card'
import { Badge } from '@howard/ui/components/ui/badge'

export function WorkstreamTemplateList() {
  const [showModal, setShowModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkstreamTemplateWithVertical | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVertical, setSelectedVertical] = useState<string>('')
  const [confirmDelete, setConfirmDelete] = useState<WorkstreamTemplateWithVertical | null>(null)

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

  const handleDelete = (template: WorkstreamTemplateWithVertical) => {
    setConfirmDelete(template)
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
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-secondary rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-10"
          />
        </div>
        <Select
          value={selectedVertical || '__all__'}
          onValueChange={(value) => setSelectedVertical(value === '__all__' ? '' : value)}
        >
          <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Verticals</SelectItem>
            {verticals.map((vertical) => (
              <SelectItem key={vertical.id} value={vertical.id}>
                {vertical.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grouped by Vertical */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <p className="font-medium">No templates found</p>
          <Button
            onClick={handleCreate}
            className="mt-4"
          >
            Create your first template
          </Button>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {verticals
            .filter((v) => templatesByVertical[v.id]?.length > 0)
            .map((vertical) => {
              const verticalTemplates = templatesByVertical[vertical.id] || []

              return (
                <AccordionItem
                  key={vertical.id}
                  value={vertical.id}
                  className="border border-border rounded-lg overflow-hidden bg-card shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-3 bg-secondary hover:bg-secondary/80 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="h-6 w-1 rounded"
                        style={{ backgroundColor: vertical.color || '#3B82F6' }}
                      />
                      <div className="text-left flex-1">
                        <h4 className="font-semibold text-foreground">{vertical.name}</h4>
                        <p className="text-xs text-muted-foreground">{vertical.description}</p>
                      </div>
                      <Badge variant="secondary" className="mr-2">
                        {verticalTemplates.length} {verticalTemplates.length !== 1 ? 'templates' : 'template'}
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4 pt-2">
                    <div className="grid gap-3">
                      {verticalTemplates.map((template: WorkstreamTemplateWithVertical) => (
                        <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h5 className="font-semibold text-foreground text-base">
                                  {template.name}
                                </h5>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(template)}
                                    title="Edit template"
                                    className="h-8 w-8"
                                  >
                                    <Edit className="h-4 w-4 text-foreground/80" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(template)}
                                    title="Delete template"
                                    className="h-8 w-8 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>

                              {template.description && (
                                <p className="text-sm text-foreground/70 mb-3 leading-relaxed">
                                  {template.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2">
                                {template.timing && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {template.timing}
                                  </Badge>
                                )}
                                {template.associated_software && (
                                  <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
                                    <Package className="h-3 w-3" />
                                    {template.associated_software}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
        </Accordion>
      )}

      {/* Summary */}
      {templates.length > 0 && (
        <div className="text-sm text-foreground/80 pt-2">
          Showing <span className="font-semibold text-foreground">{templates.length}</span> template
          {templates.length !== 1 ? 's' : ''} across{' '}
          <span className="font-semibold text-foreground">
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="Delete Template"
        description={`Are you sure you want to delete "${confirmDelete?.name}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (confirmDelete) {
            await deleteMutation.mutateAsync(confirmDelete.id)
            setConfirmDelete(null)
          }
        }}
      />
    </div>
  )
}
