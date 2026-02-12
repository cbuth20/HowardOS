import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '@/lib/utils/auth-fetch'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/.netlify/functions'

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  mentions: string[]
  is_internal: boolean
  created_at: string
  updated_at: string
  user?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    role: string
  }
}

export const taskCommentKeys = {
  all: ['task-comments'] as const,
  list: (taskId: string) => [...taskCommentKeys.all, taskId] as const,
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: taskCommentKeys.list(taskId || ''),
    queryFn: async () => {
      const response = await authFetch(`${API_URL}/task-comments?taskId=${taskId}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data.comments as TaskComment[]
    },
    enabled: !!taskId,
  })
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { task_id: string; content: string; is_internal?: boolean }) => {
      const response = await authFetch(`${API_URL}/task-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create comment')
      return data.data.comment as TaskComment
    },
    onSuccess: (comment) => {
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.list(comment.task_id) })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string; taskId: string }) => {
      const response = await authFetch(`${API_URL}/task-comments?id=${params.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete comment')
      return params
    },
    onSuccess: (params) => {
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.list(params.taskId) })
      toast.success('Comment deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
