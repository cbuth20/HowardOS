import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '../client'
import toast from 'react-hot-toast'

export const channelKeys = {
  all: ['file-channels'] as const,
  lists: () => [...channelKeys.all, 'list'] as const,
  detail: (id: string) => [...channelKeys.all, 'detail', id] as const,
  files: (channelId: string, folderPath?: string) =>
    [...channelKeys.all, 'files', channelId, { folderPath }] as const,
}

export function useFileChannels() {
  return useQuery({
    queryKey: channelKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.getFileChannels()
      return response.channels
    },
  })
}

export function useFileChannel(id: string) {
  return useQuery({
    queryKey: channelKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.getFileChannel(id)
      return response.channel
    },
    enabled: !!id,
  })
}

export function useChannelFiles(channelId: string, folderPath: string = '/') {
  return useQuery({
    queryKey: channelKeys.files(channelId, folderPath),
    queryFn: async () => {
      const response = await apiClient.getChannelFiles(channelId, folderPath)
      return response
    },
    enabled: !!channelId,
  })
}

export function useCreateFileChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { client_org_id: string; name?: string; description?: string }) =>
      apiClient.createFileChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() })
      toast.success('Channel created')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateFileChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      apiClient.updateFileChannel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all })
      toast.success('Channel updated')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteFileChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteFileChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all })
      toast.success('Channel deleted')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useCreateChannelFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { channel_id: string; name: string; parent_path?: string }) =>
      apiClient.createChannelFolder(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.files(variables.channel_id) })
      toast.success('Folder created')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteChannelFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteChannelFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all })
      toast.success('Folder deleted')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}
