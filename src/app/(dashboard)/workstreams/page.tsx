'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClientWorkstreams, useWorkstreamVerticals } from '@/lib/api/hooks/useWorkstreams'
import { useClients } from '@/lib/api/hooks/useUsers'
import { WorkstreamTemplateList } from '@/components/workstreams/WorkstreamTemplateList'
import { ClientWorkstreamList } from '@/components/workstreams/ClientWorkstreamList'
import { WorkstreamCard } from '@/components/workstreams/WorkstreamCard'
import { AssignWorkstreamModal } from '@/components/workstreams/AssignWorkstreamModal'
import { WorkstreamStatusBadge } from '@/components/workstreams/WorkstreamStatusBadge'
import { WorkstreamTemplateWithVertical } from '@/types/entities'
import { ClipboardList, Filter } from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'templates' | 'assignments'>('templates')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkstreamTemplateWithVertical | null>(null)

  // Client view state
  const [clientFilters, setClientFilters] = useState({
    vertical_id: '',
    status: '',
  })

  // Fetch data
  const { data: clientWorkstreams = [], isLoading: loadingWorkstreams } = useClientWorkstreams({
    is_active: true,
  })
  const { data: verticals = [] } = useWorkstreamVerticals()

  // Only fetch clients for admins
  const { data: clientsData } = useClients({
    enabled: isAdmin,
  })

  const clients = clientsData?.clients || []
  const organizations = Array.from(
    new Map(clients.map((c) => [c.org_id, { id: c.org_id, name: c.organizations?.name || '' }])).values()
  )

  // Handle assign click from template list
  const handleAssignClick = (template: WorkstreamTemplateWithVertical) => {
    setSelectedTemplate(template)
    setShowAssignModal(true)
  }

  // Filter client workstreams
  const filteredClientWorkstreams = clientWorkstreams.filter((w) => {
    if (clientFilters.vertical_id && w.template?.vertical_id !== clientFilters.vertical_id) {
      return false
    }
    if (clientFilters.status && w.status !== clientFilters.status) {
      return false
    }
    return true
  })

  // Group client workstreams by vertical
  const workstreamsByVertical = filteredClientWorkstreams.reduce((acc, workstream) => {
    const verticalId = workstream.template?.vertical_id || 'uncategorized'
    if (!acc[verticalId]) acc[verticalId] = []
    acc[verticalId].push(workstream)
    return acc
  }, {} as Record<string, typeof filteredClientWorkstreams>)

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
                Manage workstream templates and client assignments
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8 flex gap-4 border-b border-neutral-border">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'assignments'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Client Assignments
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-4 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-brand-primary before:rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-navy">
                    {clientWorkstreams.length}
                  </p>
                  <p className="text-xs text-text-muted">Active Workstreams</p>
                </div>
              </div>
            </div>

            <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-4 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-red-500 before:rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <WorkstreamStatusBadge status="red" size="md" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-navy">
                    {clientWorkstreams.filter((w) => w.status === 'red').length}
                  </p>
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
                  <p className="text-2xl font-bold text-brand-navy">
                    {clientWorkstreams.filter((w) => w.status === 'green').length}
                  </p>
                  <p className="text-xs text-text-muted">On Track</p>
                </div>
              </div>
            </div>
          </div>

          {activeTab === 'templates' ? (
            <WorkstreamTemplateList onAssignClick={handleAssignClick} />
          ) : (
            <ClientWorkstreamList organizations={organizations} />
          )}
        </div>

        {/* Assign Modal */}
        <AssignWorkstreamModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedTemplate(null)
          }}
          template={selectedTemplate}
          organizations={organizations}
          users={clients}
        />
      </div>
    )
  }

  // Client View
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Sticky Topbar */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-border shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex gap-2">
              <ClipboardList className="w-6 h-6 text-brand-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">
                Your Workstreams
              </h1>
            </div>
            <p className="text-sm text-text-muted">
              {loadingWorkstreams ? 'Loading...' : `${filteredClientWorkstreams.length} ${filteredClientWorkstreams.length === 1 ? 'workstream' : 'workstreams'}`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-4 flex flex-col sm:flex-row gap-4 border-t border-neutral-border">
          <select
            value={clientFilters.vertical_id}
            onChange={(e) => setClientFilters({ ...clientFilters, vertical_id: e.target.value })}
            className="flex-1 rounded-lg border border-neutral-border px-4 py-2 focus:border-brand-primary focus:outline-none"
          >
            <option value="">All Verticals</option>
            {verticals.map((vertical) => (
              <option key={vertical.id} value={vertical.id}>
                {vertical.name}
              </option>
            ))}
          </select>

          <select
            value={clientFilters.status}
            onChange={(e) => setClientFilters({ ...clientFilters, status: e.target.value })}
            className="rounded-lg border border-neutral-border px-4 py-2 focus:border-brand-primary focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="red">🔴 Red</option>
            <option value="yellow">🟡 Yellow</option>
            <option value="green">🟢 Green</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {loadingWorkstreams ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-24 bg-background-card rounded-lg border border-neutral-border" />
            ))}
          </div>
        ) : filteredClientWorkstreams.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-neutral-border" />
            <p className="text-lg font-medium text-text-primary">No workstreams found</p>
            <p className="text-sm mt-2">
              {clientWorkstreams.length === 0
                ? 'No workstreams have been assigned to you yet.'
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {verticals
              .filter((v) => workstreamsByVertical[v.id]?.length > 0)
              .map((vertical) => (
                <div key={vertical.id}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="h-1 w-12 rounded"
                      style={{ backgroundColor: vertical.color || '#3B82F6' }}
                    />
                    <h2 className="text-lg font-semibold text-gray-900">{vertical.name}</h2>
                    <span className="text-sm text-gray-500">
                      ({workstreamsByVertical[vertical.id].length})
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {workstreamsByVertical[vertical.id].map((workstream: any) => (
                      <WorkstreamCard key={workstream.id} workstream={workstream} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
