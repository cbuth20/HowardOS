import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
// import { OnboardingCheck } from '@/components/onboarding/OnboardingCheck'

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
    .select('*, organizations(name)')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        userRole={profile?.role}
        orgName={profile?.organizations?.name}
        userName={profile?.full_name}
        userEmail={user.email || ''}
        userAvatar={profile?.avatar_url}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
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
    </div>
  )
}
