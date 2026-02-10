'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, Building2, Search } from 'lucide-react'
import { WorkstreamWithEntriesAndRollup } from '@/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'
import { useCreateClientWorkstream } from '@/lib/api/hooks/useWorkstreams'
import toast from 'react-hot-toast'

interface ClientWorkstreamListProps {
  workstreams: WorkstreamWithEntriesAndRollup[]
  organizations: Array<{ id: string; name: string }>
  loading?: boolean
  onSelectWorkstream?: (workstreamId: string) => void
}

export function ClientWorkstreamList({
  workstreams,
  organizations,
  loading = false,
  onSelectWorkstream,
}: ClientWorkstreamListProps) {
  const router = useRouter()
  const [filters, setFilters] = useState({
    org_id: '',
    status: '',
    search: '',
  })

  const createWorkstreamMutation = useCreateClientWorkstream()

  // Handle create workstream for an org
  const handleCreateWorkstream = async (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId)
    if (!org) return

    if (!confirm(`Create a new workstream for ${org.name}?`)) return

    try {
      const result = await createWorkstreamMutation.mutateAsync({
        org_id: orgId,
        name: 'Workstream',
        notes: null,
      })
      toast.success('Workstream created successfully')
      // Navigate to the new workstream
      if (onSelectWorkstream) {
        onSelectWorkstream(result.workstream.id)
      } else {
        router.push(`/workstreams/${result.workstream.id}`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workstream')
    }
  }

  // Handle navigate to workstream
  const handleNavigate = (workstreamId: string) => {
    if (onSelectWorkstream) {
      onSelectWorkstream(workstreamId)
    } else {
      router.push(`/workstreams/${workstreamId}`)
    }
  }

  // Find orgs without workstreams
  const orgsWithWorkstreams = new Set(workstreams.map((w) => w.org_id))
  const orgsWithoutWorkstreams = organizations.filter((org) => !orgsWithWorkstreams.has(org.id))

  // Filter workstreams
  const filteredWorkstreams = workstreams.filter((w) => {
    if (filters.org_id && w.org_id !== filters.org_id) {
      return false
    }
    if (filters.status && w.overall_status !== filters.status) {
      return false
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        w.organization?.name.toLowerCase().includes(searchLower) ||
        w.name.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search organizations..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <select
          value={filters.org_id}
          onChange={(e) => setFilters({ ...filters, org_id: e.target.value })}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          <option value="">All Organizations ({workstreams.length})</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          <option value="">All Statuses</option>
          <option value="red">🔴 Red</option>
          <option value="yellow">🟡 Yellow</option>
          <option value="green">🟢 Green</option>
        </select>
      </div>

      {/* Workstreams Table */}
      {filteredWorkstreams.length === 0 && orgsWithoutWorkstreams.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">No workstreams yet</p>
          <p className="text-sm mt-2">
            Create workstreams for your client organizations to get started
          </p>
        </div>
      ) : (
        <>
          {/* Existing Workstreams Table */}
          {filteredWorkstreams.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entries
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verticals
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Breakdown
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredWorkstreams.map((workstream) => {
                    const totalRed = workstream.vertical_rollups?.reduce((sum, r) => sum + r.red_count, 0) || 0
                    const totalYellow = workstream.vertical_rollups?.reduce((sum, r) => sum + r.yellow_count, 0) || 0
                    const totalGreen = workstream.vertical_rollups?.reduce((sum, r) => sum + r.green_count, 0) || 0

                    return (
                      <tr
                        key={workstream.id}
                        onClick={() => handleNavigate(workstream.id)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900">
                              {workstream.organization?.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <WorkstreamStatusBadge
                            status={workstream.overall_status || 'yellow'}
                            size="sm"
                            showLabel={true}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-gray-900">
                            {workstream.total_entries || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {workstream.vertical_rollups?.length || 0} active
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-xs">
                            {totalRed > 0 && (
                              <span className="text-red-600 font-medium">{totalRed}🔴</span>
                            )}
                            {totalYellow > 0 && (
                              <span className="text-yellow-600 font-medium">{totalYellow}🟡</span>
                            )}
                            {totalGreen > 0 && (
                              <span className="text-green-600 font-medium">{totalGreen}🟢</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Organizations without workstreams */}
          {!filters.org_id && !filters.status && !filters.search && orgsWithoutWorkstreams.length > 0 && (
            <div className="space-y-3">
              <div className="pt-2 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Organizations without workstreams ({orgsWithoutWorkstreams.length})
                </h3>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <tbody className="bg-white divide-y divide-gray-100">
                    {orgsWithoutWorkstreams.map((org) => (
                      <tr key={org.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{org.name}</div>
                              <div className="text-xs text-gray-500">No workstream created yet</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCreateWorkstream(org.id)
                            }}
                            disabled={createWorkstreamMutation.isPending}
                            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Create Workstream
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Summary Stats */}
      {filteredWorkstreams.length > 0 && (
        <div className="flex gap-6 text-sm text-gray-600 pt-2 border-t border-gray-200">
          <div>
            Total: <span className="font-semibold text-gray-900">{filteredWorkstreams.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <WorkstreamStatusBadge status="red" size="sm" />
            <span className="font-semibold text-gray-900">
              {filteredWorkstreams.filter((w) => w.overall_status === 'red').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <WorkstreamStatusBadge status="yellow" size="sm" />
            <span className="font-semibold text-gray-900">
              {filteredWorkstreams.filter((w) => w.overall_status === 'yellow').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <WorkstreamStatusBadge status="green" size="sm" />
            <span className="font-semibold text-gray-900">
              {filteredWorkstreams.filter((w) => w.overall_status === 'green').length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
