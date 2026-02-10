'use client'

import { useState } from 'react'
import { Plus, FileText, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import { BulkAddEntriesModal } from './BulkAddEntriesModal'
import toast from 'react-hot-toast'

interface WorkstreamDetailViewProps {
  workstream: WorkstreamWithEntriesAndRollup
  isAdmin?: boolean
  onBack?: () => void
}

export function WorkstreamDetailView({ workstream, isAdmin = false, onBack }: WorkstreamDetailViewProps) {
  const router = useRouter()
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showBulkAddModal, setShowBulkAddModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<WorkstreamEntryWithDetails | null>(null)

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

  // Handle create entry
  const handleCreateEntry = async (data: any) => {
    try {
      await createEntryMutation.mutateAsync(data)
      toast.success('Entry created successfully')
      setShowEntryModal(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create entry')
    }
  }

  // Handle update entry
  const handleUpdateEntry = async (data: any) => {
    if (!editingEntry) return

    try {
      await updateEntryMutation.mutateAsync({
        id: editingEntry.id,
        data,
      })
      toast.success('Entry updated successfully')
      setShowEntryModal(false)
      setEditingEntry(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update entry')
    }
  }

  // Handle edit click
  const handleEditEntry = (entry: WorkstreamEntryWithDetails) => {
    setEditingEntry(entry)
    setShowEntryModal(true)
  }

  // Handle delete entry
  const handleDeleteEntry = async (entry: WorkstreamEntryWithDetails) => {
    if (!confirm(`Are you sure you want to delete "${entry.name}"?`)) return

    try {
      await deleteEntryMutation.mutateAsync(entry.id)
      toast.success('Entry deleted successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete entry')
    }
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
      setShowBulkAddModal(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to add entries')
    }
  }

  // Handle modal close
  const handleCloseEntryModal = () => {
    setShowEntryModal(false)
    setEditingEntry(null)
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-secondary transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Client Workstreams
      </button>

      {/* Header + Actions */}
      <div className="bg-white border border-neutral-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {workstream.organization?.name} - Workstream
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {totalEntries} entr{totalEntries !== 1 ? 'ies' : 'y'} across {verticalRollups.length} verticals
            </p>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkAddModal(true)}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Add Templates
              </button>

              <button
                onClick={() => {
                  setEditingEntry(null)
                  setShowEntryModal(true)
                }}
                className="px-3 py-1.5 bg-brand-primary text-white text-sm rounded-lg hover:bg-brand-secondary transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Entry
              </button>
            </div>
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
              ? 'No entries yet. Click "Create Entry" or "Add from Templates" to get started.'
              : 'No entries have been added to your workstream yet.'
          }
        />
      </div>

      {/* Modals */}
      {isAdmin && (
        <>
          <WorkstreamEntryModal
            isOpen={showEntryModal}
            onClose={handleCloseEntryModal}
            onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}
            entry={editingEntry}
            workstreamId={workstream.id}
            verticals={verticals}
            users={users}
            isSubmitting={createEntryMutation.isPending || updateEntryMutation.isPending}
          />

          <BulkAddEntriesModal
            isOpen={showBulkAddModal}
            onClose={() => setShowBulkAddModal(false)}
            onSubmit={handleBulkAdd}
            workstreamId={workstream.id}
            isSubmitting={bulkCreateMutation.isPending}
          />
        </>
      )}
    </div>
  )
}
