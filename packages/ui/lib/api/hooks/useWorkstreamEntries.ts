import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import type {
  CreateWorkstreamEntrySchemaInput,
  UpdateWorkstreamEntrySchemaInput,
  BulkCreateEntriesSchemaInput,
} from '../../../types/schemas'

// Query keys
export const workstreamEntriesKeys = {
  all: ['workstream-entries'] as const,
  lists: () => [...workstreamEntriesKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) =>
    [...workstreamEntriesKeys.lists(), { filters }] as const,
  details: () => [...workstreamEntriesKeys.all, 'detail'] as const,
  detail: (id: string) => [...workstreamEntriesKeys.details(), id] as const,
  rollups: () => [...workstreamEntriesKeys.all, 'rollup'] as const,
  rollup: (workstreamId: string) =>
    [...workstreamEntriesKeys.rollups(), workstreamId] as const,
}

// Query hooks
export function useWorkstreamEntries(filters?: {
  workstream_id?: string
  vertical_id?: string
  status?: string
  point_person_id?: string
  is_active?: boolean
}) {
  return useQuery({
    queryKey: workstreamEntriesKeys.list(filters),
    queryFn: () => apiClient.getWorkstreamEntries(filters),
  })
}

export function useWorkstreamEntry(id: string, enabled = true) {
  return useQuery({
    queryKey: workstreamEntriesKeys.detail(id),
    queryFn: () => apiClient.getWorkstreamEntry(id),
    enabled,
  })
}

export function useWorkstreamRollup(workstreamId: string, enabled = true) {
  return useQuery({
    queryKey: workstreamEntriesKeys.rollup(workstreamId),
    queryFn: () => apiClient.getWorkstreamRollup(workstreamId),
    enabled: enabled && !!workstreamId,
  })
}

// Mutation hooks
export function useCreateWorkstreamEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWorkstreamEntrySchemaInput) =>
      apiClient.createWorkstreamEntry(data),
    onSuccess: (_, variables) => {
      // Invalidate entries list for this workstream
      queryClient.invalidateQueries({
        queryKey: workstreamEntriesKeys.list({ workstream_id: variables.workstream_id }),
      })
      // Invalidate rollup for this workstream
      queryClient.invalidateQueries({
        queryKey: workstreamEntriesKeys.rollup(variables.workstream_id),
      })
      // Invalidate the full workstream (includes entries)
      queryClient.invalidateQueries({
        queryKey: ['client-workstreams', 'detail', variables.workstream_id],
      })
    },
  })
}

export function useBulkCreateWorkstreamEntries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BulkCreateEntriesSchemaInput) =>
      apiClient.bulkCreateWorkstreamEntries(data),
    onSuccess: (_, variables) => {
      // Invalidate entries list for this workstream
      queryClient.invalidateQueries({
        queryKey: workstreamEntriesKeys.list({ workstream_id: variables.workstream_id }),
      })
      // Invalidate rollup for this workstream
      queryClient.invalidateQueries({
        queryKey: workstreamEntriesKeys.rollup(variables.workstream_id),
      })
      // Invalidate the full workstream (includes entries)
      queryClient.invalidateQueries({
        queryKey: ['client-workstreams', 'detail', variables.workstream_id],
      })
    },
  })
}

export function useUpdateWorkstreamEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkstreamEntrySchemaInput }) =>
      apiClient.updateWorkstreamEntry(id, data),
    onSuccess: (result) => {
      // Invalidate the specific entry
      queryClient.invalidateQueries({
        queryKey: workstreamEntriesKeys.detail(result.entry.id),
      })
      // Invalidate entries list for this workstream
      queryClient.invalidateQueries({
        queryKey: workstreamEntriesKeys.list({ workstream_id: result.entry.workstream_id }),
      })
      // Invalidate rollup for this workstream (status may have changed)
      queryClient.invalidateQueries({
        queryKey: workstreamEntriesKeys.rollup(result.entry.workstream_id),
      })
      // Invalidate the full workstream (includes entries)
      queryClient.invalidateQueries({
        queryKey: ['client-workstreams', 'detail', result.entry.workstream_id],
      })
    },
  })
}

export function useDeleteWorkstreamEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteWorkstreamEntry(id),
    onSuccess: () => {
      // Invalidate all entries lists (we don't know which workstream this belonged to)
      queryClient.invalidateQueries({
        queryKey: workstreamEntriesKeys.lists(),
      })
      // Invalidate all rollups
      queryClient.invalidateQueries({
        queryKey: workstreamEntriesKeys.rollups(),
      })
      // Invalidate all workstreams
      queryClient.invalidateQueries({
        queryKey: ['client-workstreams'],
      })
    },
  })
}
