'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, ArrowLeft } from 'lucide-react'
import { WorkstreamTemplateWithVertical, WorkstreamVertical, WorkstreamEntryWithDetails, User, WorkstreamStatus, WorkstreamTiming } from '@howard/ui/types/entities'
import { useWorkstreamTemplates, useWorkstreamVerticals } from '@howard/ui/lib/api/hooks'
import { useSoftwareCatalog } from '@howard/ui/lib/api/hooks/useSoftwareCatalog'
import { Button } from '@howard/ui/components/ui/button'
import { Input } from '@howard/ui/components/ui/input'
import { Textarea } from '@howard/ui/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@howard/ui/components/ui/select'
import { Label } from '@howard/ui/components/ui/label'
import { Checkbox } from '@howard/ui/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@howard/ui/components/ui/dialog'

interface AddEntriesModalProps {
  isOpen: boolean
  onClose: () => void
  onBulkAdd: (templateIds: string[]) => void
  onCreateCustom: (data: any) => void
  workstreamId: string
  users: User[]
  isSubmitting?: boolean
}

type ModalMode = 'browse' | 'create-custom'

export function AddEntriesModal({
  isOpen,
  onClose,
  onBulkAdd,
  onCreateCustom,
  workstreamId,
  users,
  isSubmitting = false,
}: AddEntriesModalProps) {
  const [mode, setMode] = useState<ModalMode>('browse')
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVertical, setFilterVertical] = useState('')

  // Fetch templates, verticals, and software catalog
  const { data: templates = [], isLoading: loadingTemplates } = useWorkstreamTemplates({
    is_active: true,
  })
  const { data: verticals = [] } = useWorkstreamVerticals()
  const { data: softwareCatalog = [] } = useSoftwareCatalog()

  // Custom entry form state
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('browse')
      setSelectedTemplates(new Set())
      setSearchQuery('')
      setFilterVertical('')
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
  }, [isOpen, verticals])

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

  const handleBulkSubmit = () => {
    if (selectedTemplates.size === 0) return
    onBulkAdd(Array.from(selectedTemplates))
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
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

    onCreateCustom(payload)
  }

  const handleBackToBrowse = () => {
    setMode('browse')
  }

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    if (filterVertical && template.vertical_id !== filterVertical) {
      return false
    }

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
        {mode === 'browse' ? (
          <>
            <DialogHeader>
              <DialogTitle>Add Entries</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select templates from the library or create a custom entry
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
                  <p className="text-sm mt-2">Try adjusting your filters or create a custom entry</p>
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
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => setMode('create-custom')}
                variant="outline"
                className="sm:mr-auto"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Custom Entry
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkSubmit}
                  disabled={isSubmitting || selectedTemplates.size === 0}
                >
                  {isSubmitting
                    ? 'Adding...'
                    : selectedTemplates.size === 0
                    ? 'Select Templates'
                    : `Add ${selectedTemplates.size} Entr${selectedTemplates.size !== 1 ? 'ies' : 'y'}`}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToBrowse}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                </Button>
                <DialogTitle>Create Custom Entry</DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Create an entry that's not based on a template
              </p>
            </DialogHeader>

            {/* Custom Entry Form */}
            <form onSubmit={handleCustomSubmit} className="flex-1 overflow-y-auto space-y-4">
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
                  onClick={handleBackToBrowse}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Back to Templates
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Entry'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
