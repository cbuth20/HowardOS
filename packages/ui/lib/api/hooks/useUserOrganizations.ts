import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '../../utils/auth-fetch'

const API_URL = import.meta.env.VITE_API_URL || '/.netlify/functions'

interface OrgMembership {
  id: string
  org_id: string
  is_primary: boolean
  created_at: string
  organization?: {
    id: string
    name: string
    slug: string
    logo_url: string | null
  }
}

interface UserMembership {
  id: string
  user_id: string
  is_primary: boolean
  created_at: string
  profile?: {
    id: string
    email: string
    full_name: string | null
    role: string
    avatar_url: string | null
    is_active: boolean
  }
}

export function useUserOrganizations(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-organizations', userId],
    queryFn: async () => {
      const response = await authFetch(`${API_URL}/user-organizations?userId=${userId}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data.memberships as OrgMembership[]
    },
    enabled: !!userId,
  })
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => {
      const response = await authFetch(`${API_URL}/user-organizations?orgId=${orgId}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data.memberships as UserMembership[]
    },
    enabled: !!orgId,
  })
}

export function useAddUserToOrg() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { user_id: string; org_id: string; is_primary?: boolean }) => {
      const response = await authFetch(`${API_URL}/user-organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data.membership
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations', variables.user_id] })
      queryClient.invalidateQueries({ queryKey: ['org-members', variables.org_id] })
    },
  })
}

export function useRemoveUserFromOrg() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id?: string; userId?: string; orgId?: string }) => {
      const queryParams = params.id
        ? `id=${params.id}`
        : `userId=${params.userId}&orgId=${params.orgId}`
      const response = await authFetch(`${API_URL}/user-organizations?${queryParams}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] })
      queryClient.invalidateQueries({ queryKey: ['org-members'] })
    },
  })
}

export function useSetPrimaryOrg() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string; userId: string }) => {
      const response = await authFetch(`${API_URL}/user-organizations?id=${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: true }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data.membership
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations', variables.userId] })
    },
  })
}
