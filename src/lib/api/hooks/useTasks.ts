import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '../client'
import { CreateTaskInput, UpdateTaskInput } from '@/types/schemas'
import toast from 'react-hot-toast'

interface TaskFilters {
  view?: string
  assignee?: string
  status?: string
}

// Query keys for better invalidation control
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.getTasks(filters)
      return response.tasks
    },
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getTask(id)
      return response.task
    },
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTaskInput) => apiClient.createTask(data),
    onSuccess: () => {
      // Invalidate ALL task list queries (with any filters)
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      toast.success('Task created')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      apiClient.updateTask(id, data),
    onSuccess: () => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.details() })
      toast.success('Task updated')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTask(id),
    onSuccess: () => {
      // Invalidate ALL task queries (list and detail)
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      toast.success('Task deleted')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}
