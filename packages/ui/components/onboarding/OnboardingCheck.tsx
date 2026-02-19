import { useState, useEffect } from 'react'
import { WelcomeModal } from './WelcomeModal'
import { useProfile } from '../../lib/api/hooks/useProfile'

interface OnboardingCheckProps {
  user: {
    id: string
    email: string
    full_name: string
    role: string
    is_onboarded: boolean
  }
  orgName: string
}

export function OnboardingCheck({ user, orgName }: OnboardingCheckProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { refreshProfile } = useProfile()

  useEffect(() => {
    // Show onboarding if user hasn't completed it
    if (!user.is_onboarded) {
      setShowOnboarding(true)
    }
  }, [user.is_onboarded])

  const handleComplete = () => {
    setShowOnboarding(false)
    refreshProfile()
  }

  return (
    <WelcomeModal
      isOpen={showOnboarding}
      onComplete={handleComplete}
      user={user}
      orgName={orgName}
    />
  )
}
