import { useParams } from 'react-router'
import { useProfile } from '@/lib/api/hooks/useProfile'
import { useClientWorkstream } from '@/lib/api/hooks/useWorkstreams'
import { WorkstreamDetailView } from '@/components/workstreams/WorkstreamDetailView'

export default function WorkstreamDetailPage() {
  const params = useParams()
  const workstreamId = params.id as string
  const { profile, isLoading: loading } = useProfile()

  const isAdmin = ['admin', 'manager'].includes(profile?.role || '')

  // Fetch workstream
  const {
    data: workstream,
    isLoading: loadingWorkstream,
    error,
  } = useClientWorkstream(workstreamId, !loading)

  // Show loading state
  if (loading || loadingWorkstream) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workstream...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !workstream) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-red-600">Workstream not found</p>
          <p className="text-sm text-gray-600 mt-2">
            The workstream you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    )
  }

  return <WorkstreamDetailView workstream={workstream} isAdmin={isAdmin} />
}
