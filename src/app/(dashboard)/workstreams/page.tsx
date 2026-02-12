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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Profile {
  id: string
  org_id: string
  role: string
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

  const isAdmin = ['admin', 'manager'].includes(profile?.role || '')

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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
      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as 'templates' | 'workstreams'); setSelectedWorkstreamId(null) }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Sticky Topbar */}
        <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <div className="flex gap-2">
                <ClipboardList className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Workstreams
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage workstream templates and client workstreams
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8">
            <TabsList className="h-auto rounded-none bg-transparent border-b-0 p-0 gap-6">
              <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-1 py-3 font-medium" value="templates">
                Templates Library
              </TabsTrigger>
              <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-1 py-3 font-medium" value="workstreams">
                Client Workstreams
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          <TabsContent value="templates" className="mt-0">
            <WorkstreamTemplateList />
          </TabsContent>

          <TabsContent value="workstreams" className="mt-0">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="relative before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-howard-evergreen before:rounded-t-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-howard-evergreen/10 rounded-lg flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-howard-evergreen" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{totalWorkstreams}</p>
                      <p className="text-xs text-muted-foreground">Total Workstreams</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-red-500 before:rounded-t-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{redWorkstreams}</p>
                      <p className="text-xs text-muted-foreground">Issues/Blocked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-green-500 before:rounded-t-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{greenWorkstreams}</p>
                      <p className="text-xs text-muted-foreground">On Track</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedWorkstreamId ? (
              loadingSelectedWorkstream ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading workstream...</p>
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
          </TabsContent>
        </div>
      </Tabs>
    )
  }

  // Client View
  if (loadingClientWorkstream) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workstream...</p>
        </div>
      </div>
    )
  }

  if (!clientWorkstream) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
          <div className="px-8 py-4">
            <div className="flex gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Your Workstream
              </h1>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 text-border" />
            <p className="text-lg font-medium text-foreground">No workstream assigned</p>
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
