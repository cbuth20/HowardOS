import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'
// import { OnboardingCheck } from '@/components/onboarding/OnboardingCheck'

interface ProfileData {
  role: 'admin' | 'client'
  full_name: string | null
  avatar_url: string | null
  organizations: {
    name: string
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

  return (
    <DashboardLayoutClient
      userRole={profile?.role}
      orgName={profile?.organizations?.name}
      userName={profile?.full_name || undefined}
      userEmail={user.email || ''}
      userAvatar={profile?.avatar_url}
    >
      {children}
      {/* Temporarily disabled until storage and DB are set up */}
      {/* <OnboardingCheck
        user={{
          id: user.id,
          email: user.email || '',
          full_name: profile?.full_name || '',
          role: profile?.role || 'client',
          is_onboarded: profile?.is_onboarded || false,
        }}
        orgName={profile?.organizations?.name || ''}
      /> */}
    </DashboardLayoutClient>
  )
}
