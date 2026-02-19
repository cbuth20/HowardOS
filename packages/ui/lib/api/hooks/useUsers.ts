import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '../client'
import { InviteUserInput, UpdateProfileInput, ChangePasswordInput } from '../../../types/schemas'
import { toast } from 'sonner'

// Query keys for better invalidation control
export const userKeys = {
  all: ['users'] as const,
  clients: () => [...userKeys.all, 'clients'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
}

export function useClients(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.clients(),
    queryFn: async () => {
      const response = await apiClient.getClients()
      return response
    },
    enabled: options?.enabled !== false,
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InviteUserInput) => apiClient.inviteUser(data),
    onSuccess: () => {
      // Invalidate user lists (affects clients page, user dropdowns, etc.)
      queryClient.invalidateQueries({ queryKey: userKeys.clients() })
      // Tasks and files might display user information, so invalidate those too
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'client-workstreams'] })
      toast.success('User invited')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfileInput) => apiClient.updateUserProfile(data),
    onSuccess: () => {
      // Invalidate profile and anywhere user info is displayed
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
      queryClient.invalidateQueries({ queryKey: userKeys.clients() })
      // Tasks, files, and workstreams might show user names/avatars
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['files', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'client-workstreams'] })
      toast.success('Profile updated')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) => apiClient.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}
