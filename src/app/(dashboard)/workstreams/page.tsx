'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  useWorkstreamVerticals,
  useAllClientWorkstreams,
  useClientWorkstreamByOrg,
  useClientWorkstream,
} from '@/lib/api/hooks/useWorkstreams'
import { useClients } from '@/lib/api/hooks/useUsers'
import { WorkstreamTemplateList } from '@/components/workstreams/WorkstreamTemplateList'
import { ClientWorkstreamList } from '@/components/workstreams/ClientWorkstreamList'
import { WorkstreamDetailView } from '@/components/workstreams/WorkstreamDetailView'
import { WorkstreamStatusBadge } from '@/components/workstreams/WorkstreamStatusBadge'
import { ClipboardList } from 'lucide-react'

interface Profile {
  id: string
  org_id: string
  role: 'admin' | 'client'
  full_name: string | null
  email: string
}

export default function WorkstreamsPage() {
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

  // Admin view state
  const [activeTab, setActiveTab] = useState<'templates' | 'workstreams'>('templates')
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState<string | null>(null)

  // Fetch data
  const { data: allWorkstreams = [], isLoading: loadingAllWorkstreams } = useAllClientWorkstreams({
    enabled: isAdmin,
  })

  // Fetch selected workstream with full details (including entries)
  const { data: selectedWorkstream, isLoading: loadingSelectedWorkstream } = useClientWorkstream(
    selectedWorkstreamId || '',
    isAdmin && !!selectedWorkstreamId
  )

  // Client-specific workstream
  const {
    data: clientWorkstream,
    isLoading: loadingClientWorkstream,
  } = useClientWorkstreamByOrg(
    profile?.org_id || '',
    !isAdmin && !!profile?.org_id
  )

  // Only fetch clients for admins
  const { data: clientsData } = useClients({
    enabled: isAdmin,
  })

  const clients = clientsData?.clients || []
  const organizations = Array.from(
    new Map(clients.map((c) => [c.org_id, { id: c.org_id, name: c.organizations?.name || '' }])).values()
  )

  // Show loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4" />
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  // Admin View
  if (isAdmin) {
    // Calculate stats
    const totalWorkstreams = allWorkstreams.length
    const redWorkstreams = allWorkstreams.filter((w) => w.overall_status === 'red').length
    const greenWorkstreams = allWorkstreams.filter((w) => w.overall_status === 'green').length

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Sticky Topbar */}
        <div className="flex-shrink-0 bg-white border-b border-neutral-border shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <div className="flex gap-2">
                <ClipboardList className="w-6 h-6 text-brand-primary" />
                <h1 className="text-xl font-semibold tracking-tight text-text-primary">
                  Workstreams
                </h1>
              </div>
              <p className="text-sm text-text-muted">
                Manage workstream templates and client workstreams
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8 flex gap-4 border-b border-neutral-border">
            <button
              onClick={() => {
                setActiveTab('templates')
                setSelectedWorkstreamId(null)
              }}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Templates Library
            </button>
            <button
              onClick={() => {
                setActiveTab('workstreams')
                setSelectedWorkstreamId(null)
              }}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'workstreams'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Client Workstreams
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Stats Cards (only show on workstreams tab) */}
          {activeTab === 'workstreams' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-4 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-brand-primary before:rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{totalWorkstreams}</p>
                    <p className="text-xs text-text-muted">Total Workstreams</p>
                  </div>
                </div>
              </div>

              <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-4 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-red-500 before:rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <WorkstreamStatusBadge status="red" size="md" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{redWorkstreams}</p>
                    <p className="text-xs text-text-muted">Issues/Blocked</p>
                  </div>
                </div>
              </div>

              <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-4 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-green-500 before:rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <WorkstreamStatusBadge status="green" size="md" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand-navy">{greenWorkstreams}</p>
                    <p className="text-xs text-text-muted">On Track</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' ? (
            <WorkstreamTemplateList />
          ) : selectedWorkstreamId ? (
            loadingSelectedWorkstream ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4" />
                  <p className="text-text-muted">Loading workstream...</p>
                </div>
              </div>
            ) : selectedWorkstream ? (
              <WorkstreamDetailView
                workstream={selectedWorkstream}
                isAdmin={true}
                onBack={() => setSelectedWorkstreamId(null)}
              />
            ) : null
          ) : (
            <ClientWorkstreamList
              workstreams={allWorkstreams}
              organizations={organizations}
              loading={loadingAllWorkstreams}
              onSelectWorkstream={(id) => setSelectedWorkstreamId(id)}
            />
          )}
        </div>
      </div>
    )
  }

  // Client View
  if (loadingClientWorkstream) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4" />
          <p className="text-text-muted">Loading your workstream...</p>
        </div>
      </div>
    )
  }

  if (!clientWorkstream) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-shrink-0 bg-white border-b border-neutral-border shadow-sm">
          <div className="px-8 py-4">
            <div className="flex gap-2">
              <ClipboardList className="w-6 h-6 text-brand-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">
                Your Workstream
              </h1>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12 text-text-muted">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 text-neutral-border" />
            <p className="text-lg font-medium text-text-primary">No workstream assigned</p>
            <p className="text-sm mt-2">
              Your workstream hasn't been set up yet. Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <WorkstreamDetailView workstream={clientWorkstream} isAdmin={false} />
}
