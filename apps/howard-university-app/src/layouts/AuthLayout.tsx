import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@howard/ui/lib/auth/AuthProvider'
import { LoadingSpinner } from '@howard/ui/components/ui/howard-loading'

export default function AuthLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
