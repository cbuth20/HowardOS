import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '../client'
import { toast } from 'sonner'

// Query keys for better invalidation control
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (folderPath?: string, view?: string) => [...fileKeys.lists(), { folderPath, view }] as const,
  permissions: () => [...fileKeys.all, 'permissions'] as const,
  permission: (fileId: string) => [...fileKeys.permissions(), fileId] as const,
}

export function useFiles(folderPath: string = '/', view: string = 'all') {
  return useQuery({
    queryKey: fileKeys.list(folderPath, view),
    queryFn: async () => {
      const response = await apiClient.getFiles(folderPath, view)
      return response.files
    },
  })
}

export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteFile(id),
    onSuccess: () => {
      // Invalidate ALL file queries (all folders and views)
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
      toast.success('File deleted')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) => apiClient.uploadFile(formData),
    onSuccess: () => {
      // Invalidate ALL file list queries
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
      toast.success('File uploaded')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useShareFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fileId, userIds, permission }: { fileId: string; userIds: string[]; permission?: string }) =>
      apiClient.shareFile(fileId, userIds, permission),
    onSuccess: () => {
      // Invalidate file lists and permissions
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
      queryClient.invalidateQueries({ queryKey: fileKeys.permissions() })
      toast.success('File shared')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useFilePermissions(fileId: string) {
  return useQuery({
    queryKey: fileKeys.permission(fileId),
    queryFn: async () => {
      const response = await apiClient.getFilePermissions(fileId)
      return response.permissions
    },
    enabled: !!fileId,
  })
}
