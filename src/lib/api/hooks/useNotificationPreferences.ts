import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '@/lib/utils/auth-fetch'
import { toast } from 'sonner'

const API_URL = import.meta.env.VITE_API_URL || '/.netlify/functions'

export interface NotificationPreferences {
  user_id: string
  task_assigned: boolean
  task_status_changed: boolean
  task_comment_added: boolean
  task_mentioned: boolean
  file_uploaded: boolean
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await authFetch(`${API_URL}/notification-preferences`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data.preferences as NotificationPreferences
    },
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<Omit<NotificationPreferences, 'user_id'>>) => {
      const response = await authFetch(`${API_URL}/notification-preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update preferences')
      return data.data.preferences as NotificationPreferences
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-preferences'], data)
      toast.success('Notification preferences updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
