'use client'

import { useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { WorkstreamWithEntriesAndRollup, WorkstreamEntryWithDetails, WorkstreamStatus } from '@/types/entities'
import { useWorkstreamVerticals } from '@/lib/api/hooks/useWorkstreams'
import { useClients } from '@/lib/api/hooks/useUsers'
import {
  useCreateWorkstreamEntry,
  useUpdateWorkstreamEntry,
  useDeleteWorkstreamEntry,
  useBulkCreateWorkstreamEntries,
} from '@/lib/api/hooks/useWorkstreamEntries'
import { WorkstreamEntriesList } from './WorkstreamEntriesList'
import { WorkstreamStatusRollup } from './WorkstreamStatusRollup'
import { WorkstreamEntryModal } from './WorkstreamEntryModal'
import { AddEntriesModal } from './AddEntriesModal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

interface WorkstreamDetailViewProps {
  workstream: WorkstreamWithEntriesAndRollup
  isAdmin?: boolean
  onBack?: () => void
}

export function WorkstreamDetailView({ workstream, isAdmin = false, onBack }: WorkstreamDetailViewProps) {
  const router = useRouter()
  const [showAddEntriesModal, setShowAddEntriesModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<WorkstreamEntryWithDetails | null>(null)
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<WorkstreamEntryWithDetails | null>(null)

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  // Fetch reference data
  const { data: verticals = [] } = useWorkstreamVerticals()
  const { data: clientsData } = useClients({ enabled: isAdmin })
  const users = clientsData?.clients || []

  // Mutations
  const createEntryMutation = useCreateWorkstreamEntry()
  const updateEntryMutation = useUpdateWorkstreamEntry()
  const deleteEntryMutation = useDeleteWorkstreamEntry()
  const bulkCreateMutation = useBulkCreateWorkstreamEntries()

  const entries = workstream.entries || []
  const verticalRollups = workstream.vertical_rollups || []
  const totalEntries = entries.length
  const overallStatus = workstream.overall_status || 'green'

  // Handle create custom entry (from unified modal)
  const handleCreateCustomEntry = async (data: any) => {
    try {
      await createEntryMutation.mutateAsync(data)
      toast.success('Entry created successfully')
      setShowAddEntriesModal(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create entry')
    }
  }

  // Handle update entry (from edit modal)
  const handleUpdateEntry = async (data: any) => {
    if (!editingEntry) return

    try {
      await updateEntryMutation.mutateAsync({
        id: editingEntry.id,
        data,
      })
      toast.success('Entry updated successfully')
      setShowEditModal(false)
      setEditingEntry(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update entry')
    }
  }

  // Handle edit click
  const handleEditEntry = (entry: WorkstreamEntryWithDetails) => {
    setEditingEntry(entry)
    setShowEditModal(true)
  }

  // Handle delete entry
  const handleDeleteEntry = (entry: WorkstreamEntryWithDetails) => {
    setConfirmDeleteEntry(entry)
  }

  // Handle status change
  const handleStatusChange = async (entry: WorkstreamEntryWithDetails, newStatus: WorkstreamStatus) => {
    try {
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        data: { status: newStatus },
      })
      toast.success('Status updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  // Handle bulk add
  const handleBulkAdd = async (templateIds: string[]) => {
    try {
      await bulkCreateMutation.mutateAsync({
        workstream_id: workstream.id,
        template_ids: templateIds,
      })
      toast.success(`Added ${templateIds.length} entries successfully`)
      setShowAddEntriesModal(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to add entries')
    }
  }

  // Handle modal close
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingEntry(null)
  }

  return (
    <div className="space-y-6 p-4">
      {/* Back Button (admin only — clients land directly on their workstream) */}
      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Client Workstreams
        </Button>
      )}

      {/* Header + Actions */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {workstream.organization?.name} - Workstream
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalEntries} entr{totalEntries !== 1 ? 'ies' : 'y'} across {verticalRollups.length} verticals
            </p>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setShowAddEntriesModal(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Entries
            </Button>
          )}
        </div>

        {/* Compact Status Rollup */}
        <WorkstreamStatusRollup
          overallStatus={overallStatus}
          verticalRollups={verticalRollups}
          totalEntries={totalEntries}
        />
      </div>

      {/* Content */}
      <div>
        {/* Entries List */}
        <WorkstreamEntriesList
          entries={entries}
          verticals={verticals}
          verticalRollups={verticalRollups}
          isAdmin={isAdmin}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
          onStatusChange={handleStatusChange}
          emptyMessage={
            isAdmin
              ? 'No entries yet. Click "Add Entries" to get started.'
              : 'No entries have been added to your workstream yet.'
          }
        />
      </div>

      {/* Modals */}
      {isAdmin && (
        <>
          {/* Unified Add Entries Modal (templates + custom) */}
          <AddEntriesModal
            isOpen={showAddEntriesModal}
            onClose={() => setShowAddEntriesModal(false)}
            onBulkAdd={handleBulkAdd}
            onCreateCustom={handleCreateCustomEntry}
            workstreamId={workstream.id}
            users={users}
            isSubmitting={bulkCreateMutation.isPending || createEntryMutation.isPending}
          />

          {/* Edit Entry Modal */}
          <WorkstreamEntryModal
            isOpen={showEditModal}
            onClose={handleCloseEditModal}
            onSubmit={handleUpdateEntry}
            entry={editingEntry}
            workstreamId={workstream.id}
            verticals={verticals}
            users={users}
            isSubmitting={updateEntryMutation.isPending}
          />
        </>
      )}

      {/* Delete Entry Confirmation */}
      <ConfirmDialog
        open={!!confirmDeleteEntry}
        onOpenChange={(open) => { if (!open) setConfirmDeleteEntry(null) }}
        title="Delete Entry"
        description={`Are you sure you want to delete "${confirmDeleteEntry?.name}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (confirmDeleteEntry) {
            try {
              await deleteEntryMutation.mutateAsync(confirmDeleteEntry.id)
              toast.success('Entry deleted successfully')
            } catch (error: any) {
              toast.error(error.message || 'Failed to delete entry')
            } finally {
              setConfirmDeleteEntry(null)
            }
          }
        }}
      />
    </div>
  )
}
