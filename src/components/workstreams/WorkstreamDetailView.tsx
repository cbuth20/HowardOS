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
}

export function WorkstreamDetailView({ workstream, isAdmin = false }: WorkstreamDetailViewProps) {
  const router = useRouter()
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showBulkAddModal, setShowBulkAddModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<WorkstreamEntryWithDetails | null>(null)

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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Sticky Header */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-border shadow-sm">
        <div className="px-8 py-4">
          {/* Back Button + Title */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex-1">
              <h1 className="text-xl font-semibold text-text-primary">
                {workstream.organization?.name} - Workstream
              </h1>
              <p className="text-sm text-text-muted">
                {totalEntries} entr{totalEntries !== 1 ? 'ies' : 'y'} across {verticalRollups.length} verticals
              </p>
            </div>

            {/* Admin Actions */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkAddModal(true)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Add from Templates
                </button>

                <button
                  onClick={() => {
                    setEditingEntry(null)
                    setShowEntryModal(true)
                  }}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Entry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Status Rollup */}
          <div className="mb-8">
            <WorkstreamStatusRollup
              overallStatus={overallStatus}
              verticalRollups={verticalRollups}
              totalEntries={totalEntries}
            />
          </div>

          {/* Workstream Notes */}
          {workstream.notes && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-1">Workstream Notes</h3>
              <p className="text-sm text-blue-700">{workstream.notes}</p>
            </div>
          )}

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
