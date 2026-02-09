'use client'

import { useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { useClientWorkstreams, useUpdateClientWorkstream, useRemoveClientWorkstream } from '@/lib/api/hooks/useWorkstreams'
import { ClientWorkstreamWithDetails, WorkstreamStatus } from '@/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'

interface ClientWorkstreamListProps {
  organizations: Array<{ id: string; name: string }>
}

export function ClientWorkstreamList({ organizations }: ClientWorkstreamListProps) {
  const [filters, setFilters] = useState({
    org_id: '',
    status: '',
  })

  const { data: workstreams = [], isLoading } = useClientWorkstreams({
    org_id: filters.org_id || undefined,
    status: filters.status || undefined,
    is_active: true,
  })

  const updateMutation = useUpdateClientWorkstream()
  const removeMutation = useRemoveClientWorkstream()

  const handleStatusChange = async (workstream: ClientWorkstreamWithDetails, newStatus: WorkstreamStatus) => {
    await updateMutation.mutateAsync({
      id: workstream.id,
      data: { status: newStatus },
    })
  }

  const handleRemove = async (workstream: ClientWorkstreamWithDetails) => {
    if (!confirm(`Remove "${workstream.template?.name}" from ${workstream.organization?.name}?`)) return
    await removeMutation.mutateAsync(workstream.id)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={filters.org_id}
          onChange={(e) => setFilters({ ...filters, org_id: e.target.value })}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Organizations</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="red">Red</option>
          <option value="yellow">Yellow</option>
          <option value="green">Green</option>
        </select>
      </div>

      {/* Table */}
      {workstreams.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          <p>No workstreams assigned yet</p>
          <p className="text-sm mt-2">
            Assign templates to clients from the Templates tab
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Organization
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Workstream
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Vertical
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Point Person
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  Timing
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {workstreams.map((workstream) => (
                <tr key={workstream.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">
                      {workstream.organization?.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">
                      {workstream.template?.name}
                    </div>
                    {workstream.template?.associated_software && (
                      <div className="text-xs text-gray-500 mt-1">
                        {workstream.template.associated_software}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className="rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: workstream.template?.vertical?.color
                          ? `${workstream.template.vertical.color}15`
                          : '#F3F4F6',
                        color: workstream.template?.vertical?.color || '#6B7280'
                      }}
                    >
                      {workstream.template?.vertical?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={workstream.status}
                      onChange={(e) =>
                        handleStatusChange(workstream, e.target.value as WorkstreamStatus)
                      }
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      disabled={updateMutation.isPending}
                    >
                      <option value="red">🔴 Red</option>
                      <option value="yellow">🟡 Yellow</option>
                      <option value="green">🟢 Green</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {workstream.point_person ? (
                      <div className="text-gray-900">
                        {workstream.point_person.full_name}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {workstream.template?.timing ? (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                        {workstream.template.timing}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleRemove(workstream)}
                      className="rounded p-1 hover:bg-red-50 disabled:opacity-50"
                      title="Remove"
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {workstreams.length > 0 && (
        <div className="flex gap-6 text-sm text-gray-600">
          <div>
            Total: <span className="font-semibold text-gray-900">{workstreams.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <WorkstreamStatusBadge status="red" size="sm" />
            <span className="font-semibold text-gray-900">
              {workstreams.filter((w) => w.status === 'red').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <WorkstreamStatusBadge status="yellow" size="sm" />
            <span className="font-semibold text-gray-900">
              {workstreams.filter((w) => w.status === 'yellow').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <WorkstreamStatusBadge status="green" size="sm" />
            <span className="font-semibold text-gray-900">
              {workstreams.filter((w) => w.status === 'green').length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
