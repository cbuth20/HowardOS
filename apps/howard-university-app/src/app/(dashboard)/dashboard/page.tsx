import { useAuth } from '@howard/ui/lib/auth/AuthProvider'
import { useProfile } from '@howard/ui/lib/api/hooks/useProfile'
import { LoadingSpinner } from '@howard/ui/components/ui/howard-loading'

export default function DashboardPage() {
  const { user } = useAuth()
  const { profile } = useProfile()

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Howard University
        </h1>
        <p className="text-muted-foreground mb-8">
          Welcome back, {profile.full_name || user?.email}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-foreground mb-2">Courses</h3>
            <p className="text-muted-foreground text-sm">Browse and manage courses</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-foreground mb-2">Students</h3>
            <p className="text-muted-foreground text-sm">Track student progress and enrollment</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-foreground mb-2">Library</h3>
            <p className="text-muted-foreground text-sm">Access learning resources and materials</p>
          </div>
        </div>
      </div>
    </div>
  )
}
