import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import type {
  CreateWorkstreamTemplateInput,
  UpdateWorkstreamTemplateInput,
  AssignWorkstreamInput,
  UpdateClientWorkstreamInput,
} from '@/types/schemas'
import toast from 'react-hot-toast'

// Query keys
export const workstreamKeys = {
  all: ['workstreams'] as const,
  verticals: () => [...workstreamKeys.all, 'verticals'] as const,
  templates: (filters?: any) => [...workstreamKeys.all, 'templates', filters] as const,
  template: (id: string) => [...workstreamKeys.all, 'templates', id] as const,
  clientWorkstreams: (filters?: any) => [...workstreamKeys.all, 'client-workstreams', filters] as const,
  clientWorkstream: (id: string) => [...workstreamKeys.all, 'client-workstreams', id] as const,
}

// ============================================================================
// Verticals (Reference Data)
// ============================================================================

export function useWorkstreamVerticals() {
  return useQuery({
    queryKey: workstreamKeys.verticals(),
    queryFn: async () => {
      const response = await apiClient.getWorkstreamVerticals()
      return response.verticals
    },
    staleTime: Infinity, // Never refetch (reference data)
  })
}

// ============================================================================
// Templates (Admin Only)
// ============================================================================

export function useWorkstreamTemplates(filters?: {
  vertical_id?: string
  timing?: string
  is_active?: boolean
  search?: string
}) {
  return useQuery({
    queryKey: workstreamKeys.templates(filters),
    queryFn: async () => {
      const response = await apiClient.getWorkstreamTemplates(filters)
      return response.templates
    },
  })
}

export function useWorkstreamTemplate(id: string) {
  return useQuery({
    queryKey: workstreamKeys.template(id),
    queryFn: async () => {
      const response = await apiClient.getWorkstreamTemplate(id)
      return response.template
    },
    enabled: !!id,
  })
}

export function useCreateWorkstreamTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWorkstreamTemplateInput) =>
      apiClient.createWorkstreamTemplate(data),
    onSuccess: () => {
      // Invalidate ALL template queries (with any filters)
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'templates'] })
      toast.success('Template created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create template')
    },
  })
}

export function useUpdateWorkstreamTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkstreamTemplateInput }) =>
      apiClient.updateWorkstreamTemplate(id, data),
    onSuccess: () => {
      // Invalidate ALL template and client workstream queries
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'templates'] })
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'client-workstreams'] })
      toast.success('Template updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update template')
    },
  })
}

export function useDeleteWorkstreamTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteWorkstreamTemplate(id),
    onSuccess: () => {
      // Invalidate ALL template and client workstream queries
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'templates'] })
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'client-workstreams'] })
      toast.success('Template deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template')
    },
  })
}

// ============================================================================
// Client Workstreams (Admin CRUD, Client Read)
// ============================================================================

export function useClientWorkstreams(filters?: {
  org_id?: string
  status?: string
  point_person_id?: string
  is_active?: boolean
}) {
  return useQuery({
    queryKey: workstreamKeys.clientWorkstreams(filters),
    queryFn: async () => {
      const response = await apiClient.getClientWorkstreams(filters)
      return response.workstreams
    },
  })
}

export function useClientWorkstream(id: string) {
  return useQuery({
    queryKey: workstreamKeys.clientWorkstream(id),
    queryFn: async () => {
      const response = await apiClient.getClientWorkstream(id)
      return response.workstream
    },
    enabled: !!id,
  })
}

export function useAssignWorkstream() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AssignWorkstreamInput) => apiClient.assignWorkstream(data),
    onSuccess: () => {
      // Invalidate ALL client workstream queries
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'client-workstreams'] })
      toast.success('Workstream assigned successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign workstream')
    },
  })
}

export function useUpdateClientWorkstream() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientWorkstreamInput }) =>
      apiClient.updateClientWorkstream(id, data),
    onSuccess: () => {
      // Invalidate ALL client workstream queries
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'client-workstreams'] })
      toast.success('Workstream updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update workstream')
    },
  })
}

export function useRemoveClientWorkstream() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.removeClientWorkstream(id),
    onSuccess: () => {
      // Invalidate ALL client workstream queries
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'client-workstreams'] })
      toast.success('Workstream removed successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove workstream')
    },
  })
}
