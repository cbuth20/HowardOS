'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useClientWorkstream } from '@/lib/api/hooks/useWorkstreams'
import { WorkstreamDetailView } from '@/components/workstreams/WorkstreamDetailView'

interface Profile {
  id: string
  org_id: string
  role: 'admin' | 'client'
  full_name: string | null
  email: string
}

export default function WorkstreamDetailPage() {
  const params = useParams()
  const workstreamId = params.id as string
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Fetch user profile
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data as Profile | null)
      setLoading(false)
    }
    loadProfile()
  }, [])

  const isAdmin = profile?.role === 'admin'

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4" />
          <p className="text-text-muted">Loading workstream...</p>
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
