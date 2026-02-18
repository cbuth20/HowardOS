import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'

export interface ProfileData {
  id: string
  role: string
  full_name: string | null
  email: string
  avatar_url: string | null
  is_onboarded: boolean
  org_id: string
  dashboard_iframe_url: string | null
  organizations: {
    name: string
  } | null
}

export interface UserOrgInfo {
  orgId: string
  orgName: string
  orgSlug: string
  isPrimary: boolean
}

interface UserOrgRow {
  org_id: string
  is_primary: boolean
  organization: {
    id: string
    name: string
    slug: string
  } | null
}

const supabase = createClient()

async function fetchProfileData(userId: string) {
  const [profileRes, orgsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, full_name, email, avatar_url, is_onboarded, org_id, dashboard_iframe_url, organizations(name)')
      .eq('id', userId)
      .single(),
    (supabase as any)
      .from('user_organizations')
      .select('org_id, is_primary, organization:organizations(id, name, slug)')
      .eq('user_id', userId),
  ])

  const profile = (profileRes.data as ProfileData | null) ?? null
  const userOrgs: UserOrgInfo[] = ((orgsRes.data as UserOrgRow[]) || []).map(uo => ({
    orgId: uo.org_id,
    orgName: uo.organization?.name || 'Unknown',
    orgSlug: uo.organization?.slug || '',
    isPrimary: uo.is_primary,
  }))

  return { profile, userOrgs }
}

/**
 * TanStack Query hook for the current user's profile + org memberships.
 * Automatically enabled when the user is authenticated.
 * Data is cached and deduplicated across components.
 */
export function useProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfileData(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Profile data is stable, 2 min stale time
    gcTime: 10 * 60 * 1000,
  })

  const refreshProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
  }

  return {
    profile: data?.profile ?? null,
    userOrgs: data?.userOrgs ?? [],
    isLoading: !!user && isLoading,
    error,
    refreshProfile,
  }
}
