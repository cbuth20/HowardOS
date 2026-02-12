import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'
// import { OnboardingCheck } from '@/components/onboarding/OnboardingCheck'

interface ProfileData {
  role: string
  full_name: string | null
  avatar_url: string | null
  organizations: {
    name: string
  } | null
}

interface UserOrgData {
  org_id: string
  is_primary: boolean
  organization: {
    id: string
    name: string
    slug: string
  } | null
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url, organizations(name)')
    .eq('id', user.id)
    .single() as { data: ProfileData | null }

  // Get user's org memberships for multi-org users
  const { data: userOrgs } = await (supabase as any)
    .from('user_organizations')
    .select('org_id, is_primary, organization:organizations(id, name, slug)')
    .eq('user_id', user.id) as { data: UserOrgData[] | null }

  return (
    <DashboardLayoutClient
      userRole={profile?.role}
      orgName={profile?.organizations?.name}
      userName={profile?.full_name || undefined}
      userEmail={user.email || ''}
      userAvatar={profile?.avatar_url}
      userOrgs={(userOrgs || []).map(uo => ({
        orgId: uo.org_id,
        orgName: uo.organization?.name || 'Unknown',
        orgSlug: uo.organization?.slug || '',
        isPrimary: uo.is_primary,
      }))}
    >
      {children}
    </DashboardLayoutClient>
  )
}
