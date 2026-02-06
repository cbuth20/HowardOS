import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '../client'
import toast from 'react-hot-toast'

export function useFiles(folderPath: string = '/', view: string = 'all') {
  return useQuery({
    queryKey: ['files', folderPath, view],
    queryFn: () => apiClient.getFiles(folderPath, view),
  })
}

export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
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
      queryClient.invalidateQueries({ queryKey: ['files'] })
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
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast.success('File shared')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useFilePermissions(fileId: string) {
  return useQuery({
    queryKey: ['file-permissions', fileId],
    queryFn: () => apiClient.getFilePermissions(fileId),
    enabled: !!fileId,
  })
}
