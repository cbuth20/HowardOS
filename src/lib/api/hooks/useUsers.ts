import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '../client'
import { InviteUserInput, UpdateProfileInput, ChangePasswordInput } from '@/types/schemas'
import toast from 'react-hot-toast'

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InviteUserInput) => apiClient.inviteUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
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
      queryClient.invalidateQueries({ queryKey: ['profile'] })
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
