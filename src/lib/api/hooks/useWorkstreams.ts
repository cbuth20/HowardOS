import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import type {
  CreateWorkstreamTemplateInput,
  UpdateWorkstreamTemplateInput,
  CreateWorkstreamSchemaInput,
  UpdateWorkstreamSchemaInput,
} from '@/types/schemas'
import toast from 'react-hot-toast'

// Query keys
export const workstreamKeys = {
  all: ['workstreams'] as const,
  verticals: () => [...workstreamKeys.all, 'verticals'] as const,
  templates: (filters?: any) => [...workstreamKeys.all, 'templates', filters] as const,
  template: (id: string) => [...workstreamKeys.all, 'templates', id] as const,
}

export const clientWorkstreamKeys = {
  all: ['client-workstreams'] as const,
  lists: () => [...clientWorkstreamKeys.all, 'list'] as const,
  list: () => [...clientWorkstreamKeys.lists()] as const,
  details: () => [...clientWorkstreamKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientWorkstreamKeys.details(), id] as const,
  byOrg: (orgId: string) => [...clientWorkstreamKeys.all, 'org', orgId] as const,
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
// Client Workstreams (New Entry-Based Model)
// ============================================================================

export function useAllClientWorkstreams(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clientWorkstreamKeys.list(),
    queryFn: async () => {
      const response = await apiClient.getAllClientWorkstreams()
      return response.workstreams
    },
    enabled: options?.enabled !== false,
  })
}

export function useClientWorkstream(id: string, enabled = true) {
  return useQuery({
    queryKey: clientWorkstreamKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getClientWorkstream(id)
      return response.workstream
    },
    enabled: enabled && !!id,
  })
}

export function useClientWorkstreamByOrg(orgId: string, enabled = true) {
  return useQuery({
    queryKey: clientWorkstreamKeys.byOrg(orgId),
    queryFn: async () => {
      const response = await apiClient.getClientWorkstreamByOrg(orgId)
      return response.workstream
    },
    enabled: enabled && !!orgId,
  })
}

export function useCreateClientWorkstream() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWorkstreamSchemaInput) =>
      apiClient.createClientWorkstream(data),
    onSuccess: (result) => {
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: clientWorkstreamKeys.lists() })
      // Invalidate the org-specific query
      queryClient.invalidateQueries({
        queryKey: clientWorkstreamKeys.byOrg(result.workstream.org_id)
      })
      toast.success('Workstream created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create workstream')
    },
  })
}

export function useUpdateClientWorkstream() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkstreamSchemaInput }) =>
      apiClient.updateClientWorkstream(id, data),
    onSuccess: (result) => {
      // Invalidate the specific workstream
      queryClient.invalidateQueries({
        queryKey: clientWorkstreamKeys.detail(result.workstream.id)
      })
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: clientWorkstreamKeys.lists() })
      // Invalidate the org-specific query
      queryClient.invalidateQueries({
        queryKey: clientWorkstreamKeys.byOrg(result.workstream.org_id)
      })
      toast.success('Workstream updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update workstream')
    },
  })
}

export function useDeleteClientWorkstream() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteClientWorkstream(id),
    onSuccess: () => {
      // Invalidate all workstream queries
      queryClient.invalidateQueries({ queryKey: clientWorkstreamKeys.all })
      toast.success('Workstream deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete workstream')
    },
  })
}
