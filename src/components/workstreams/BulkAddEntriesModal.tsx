'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { WorkstreamTemplateWithVertical, WorkstreamVertical } from '@/types/entities'
import { useWorkstreamTemplates, useWorkstreamVerticals } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Entries from Templates</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedTemplates.size} template{selectedTemplates.size !== 1 ? 's' : ''} selected
          </p>
        </DialogHeader>

        {/* Filters */}
        <div className="border-b border-border bg-secondary rounded-lg p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>

          {/* Vertical Filter & Actions */}
          <div className="flex items-center gap-3">
            <Select
              value={filterVertical || '__all__'}
              onValueChange={(value) => setFilterVertical(value === '__all__' ? '' : value)}
            >
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Verticals</SelectItem>
                {verticals.map((vertical) => (
                  <SelectItem key={vertical.id} value={vertical.id}>
                    {vertical.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
            >
              Select All
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
            >
              Deselect All
            </Button>
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto py-4">
          {loadingTemplates ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-foreground/80">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
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
                      <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                        {vertical.name}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        ({templatesByVertical[vertical.id].length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {templatesByVertical[vertical.id].map((template: WorkstreamTemplateWithVertical) => (
                        <label
                          key={template.id}
                          className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedTemplates.has(template.id)}
                            onCheckedChange={() => handleToggleTemplate(template.id)}
                            className="mt-1"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-md text-foreground">{template.name}</span>
                              {template.timing && (
                                <span className="text-xs px-2 py-1 bg-secondary text-foreground/80 rounded">
                                  {template.timing}
                                </span>
                              )}
                            </div>

                            {template.description && (
                              <p className="text-xs text-foreground/80 mt-1">{template.description}</p>
                            )}

                            {template.associated_software && (
                              <p className="text-xs text-muted-foreground mt-1">
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
            onClick={handleSubmit}
            disabled={isSubmitting || selectedTemplates.size === 0}
          >
            {isSubmitting
              ? 'Adding...'
              : `Add ${selectedTemplates.size} Entr${selectedTemplates.size !== 1 ? 'ies' : 'y'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
