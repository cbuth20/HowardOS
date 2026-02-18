import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useProfile } from '@/lib/api/hooks/useProfile'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'
import { OnboardingCheck } from '@/components/onboarding/OnboardingCheck'
import { LoadingSpinner } from '@/components/ui/howard-loading'

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
