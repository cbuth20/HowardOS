import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@howard/ui/lib/auth/AuthProvider'
import { useProfile } from '@howard/ui/lib/api/hooks/useProfile'
import { DashboardLayoutClient } from '@howard/ui/components/layout/DashboardLayoutClient'
import { OnboardingCheck } from '@howard/ui/components/onboarding/OnboardingCheck'
import { LoadingSpinner } from '@howard/ui/components/ui/howard-loading'
import { navItems, appLinks } from '@/config/navigation'

export default function DashboardLayout() {
  const { user, loading: authLoading } = useAuth()
  const { profile, userOrgs, isLoading: profileLoading } = useProfile()

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <DashboardLayoutClient
      userRole={profile?.role}
      orgName={profile?.organizations?.name}
      userName={profile?.full_name || undefined}
      userEmail={user.email || ''}
      userAvatar={profile?.avatar_url}
      userOrgs={userOrgs}
      navItems={navItems}
      appLinks={appLinks}
    >
      {profile && !profile.is_onboarded && (
        <OnboardingCheck
          user={{
            id: user.id,
            email: user.email || '',
            full_name: profile.full_name || '',
            role: profile.role,
            is_onboarded: profile.is_onboarded,
          }}
          orgName={profile.organizations?.name || ''}
        />
      )}
      <Outlet />
    </DashboardLayoutClient>
  )
}
