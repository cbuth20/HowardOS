'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Edit2, Trash2, Clock, User, Package } from 'lucide-react'
import {
  WorkstreamEntryWithDetails,
  WorkstreamVertical,
  VerticalStatusRollup,
  WorkstreamStatus,
} from '@/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'
import { VerticalStatusBadge } from './VerticalStatusBadge'

interface WorkstreamEntriesListProps {
  entries: WorkstreamEntryWithDetails[]
  verticals: WorkstreamVertical[]
  verticalRollups?: VerticalStatusRollup[]
  isAdmin?: boolean
  onEditEntry?: (entry: WorkstreamEntryWithDetails) => void
  onDeleteEntry?: (entry: WorkstreamEntryWithDetails) => void
  onStatusChange?: (entry: WorkstreamEntryWithDetails, newStatus: WorkstreamStatus) => void
  emptyMessage?: string
}

export function WorkstreamEntriesList({
  entries,
  verticals,
  verticalRollups = [],
  isAdmin = false,
  onEditEntry,
  onDeleteEntry,
  onStatusChange,
  emptyMessage = 'No entries yet',
}: WorkstreamEntriesListProps) {
  // Track which verticals are expanded (default all expanded)
  const [expandedVerticals, setExpandedVerticals] = useState<Set<string>>(
    new Set(verticals.map((v) => v.id))
  )
  // Track which entry rows are expanded for details
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const toggleVertical = (verticalId: string) => {
    setExpandedVerticals((prev) => {
      const next = new Set(prev)
      if (next.has(verticalId)) {
        next.delete(verticalId)
      } else {
        next.add(verticalId)
      }
      return next
    })
  }

  const toggleEntry = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  // Group entries by vertical
  const entriesByVertical = entries.reduce((acc, entry) => {
    const verticalId = entry.vertical_id || 'uncategorized'
    if (!acc[verticalId]) acc[verticalId] = []
    acc[verticalId].push(entry)
    return acc
  }, {} as Record<string, WorkstreamEntryWithDetails[]>)

  // Get rollup for a vertical
  const getRollup = (verticalId: string) => {
    return verticalRollups.find((r) => r.vertical_id === verticalId)
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted border border-dashed rounded-lg">
        <p className="text-lg font-medium text-text-primary">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {verticals.map((vertical) => {
        const verticalEntries = entriesByVertical[vertical.id] || []
        const isVerticalExpanded = expandedVerticals.has(vertical.id)
        const rollup = getRollup(vertical.id)

        // Skip verticals with no entries
        if (verticalEntries.length === 0) return null

        return (
          <div key={vertical.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
            {/* Vertical Header */}
            <button
              onClick={() => toggleVertical(vertical.id)}
              className="w-full bg-gray-50 hover:bg-gray-100 transition-colors px-5 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {isVerticalExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}

                <div
                  className="h-6 w-1 rounded"
                  style={{ backgroundColor: vertical.color || '#3B82F6' }}
                />

                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">{vertical.name}</h4>
                  {vertical.description && (
                    <p className="text-xs text-gray-500">{vertical.description}</p>
                  )}
                </div>
              </div>

              {/* Rollup Badge */}
              <div className="flex items-center gap-3">
                {rollup && <VerticalStatusBadge rollup={rollup} showCounts={true} />}
              </div>
            </button>

            {/* Entries Table */}
            {isVerticalExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-t border-gray-200">
                    <tr>
                      <th className="w-10 px-3"></th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Timing
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Point Person
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Software
                      </th>
                      {isAdmin && (
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {verticalEntries.map((entry) => {
                      const isEntryExpanded = expandedEntries.has(entry.id)

                      return (
                        <React.Fragment key={entry.id}>
                          {/* Main Row */}
                          <tr
                            className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                            onClick={() => toggleEntry(entry.id)}
                          >
                            <td className="px-3 py-4">
                              {isEntryExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </td>
                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                              {isAdmin && onStatusChange ? (
                                <select
                                  value={entry.status}
                                  onChange={(e) =>
                                    onStatusChange(entry, e.target.value as WorkstreamStatus)
                                  }
                                  className="text-xs rounded-md border border-gray-300 font-medium cursor-pointer focus:ring-2 focus:ring-brand-primary focus:border-brand-primary px-2.5 py-1.5 bg-white hover:border-gray-400 transition-colors"
                                >
                                  <option value="green">🟢 Green</option>
                                  <option value="yellow">🟡 Yellow</option>
                                  <option value="red">🔴 Red</option>
                                </select>
                              ) : (
                                <WorkstreamStatusBadge status={entry.status} size="sm" showLabel={false} />
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium text-gray-900 text-sm">{entry.name}</div>
                            </td>
                            <td className="px-4 py-4">
                              {entry.timing ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                  {entry.timing}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {entry.point_person ? (
                                <div className="text-sm text-gray-900">
                                  {entry.point_person.full_name}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {entry.associated_software ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                  {entry.associated_software}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  {onEditEntry && (
                                    <button
                                      onClick={() => onEditEntry(entry)}
                                      className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                                      title="Edit entry"
                                    >
                                      <Edit2 className="h-4 w-4 text-gray-600" />
                                    </button>
                                  )}
                                  {onDeleteEntry && (
                                    <button
                                      onClick={() => onDeleteEntry(entry)}
                                      className="p-2 rounded-md hover:bg-red-50 transition-colors"
                                      title="Delete entry"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>

                          {/* Expanded Details Row */}
                          {isEntryExpanded && (
                            <tr className="bg-gray-50/50 border-t border-gray-200">
                              <td className="px-3"></td>
                              <td colSpan={isAdmin ? 6 : 5} className="px-4 py-5">
                                <div className="space-y-4 text-sm">
                                  {/* Description */}
                                  {entry.description && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                        Description
                                      </h5>
                                      <p className="text-gray-600 leading-relaxed">{entry.description}</p>
                                    </div>
                                  )}

                                  {/* Notes */}
                                  {entry.notes && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                        Notes
                                      </h5>
                                      <p className="text-gray-600 bg-white rounded-lg p-3 border border-gray-200 leading-relaxed">
                                        {entry.notes}
                                      </p>
                                    </div>
                                  )}

                                  {/* SOP */}
                                  {entry.custom_sop && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                        Standard Operating Procedure
                                      </h5>
                                      <div className="text-gray-600 bg-white rounded-lg p-3 border border-gray-200 max-h-48 overflow-y-auto">
                                        {typeof entry.custom_sop === 'string' ? (
                                          <p className="whitespace-pre-wrap leading-relaxed">{entry.custom_sop}</p>
                                        ) : (
                                          <pre className="text-xs font-mono">
                                            {JSON.stringify(entry.custom_sop, null, 2)}
                                          </pre>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Metadata */}
                                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-3 border-t border-gray-200">
                                    {entry.template && (
                                      <div>
                                        Created from template:{' '}
                                        <span className="font-medium text-gray-700">
                                          {entry.template.name}
                                        </span>
                                      </div>
                                    )}
                                    <div>
                                      Created:{' '}
                                      <span className="font-medium text-gray-700">
                                        {new Date(entry.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div>
                                      Updated:{' '}
                                      <span className="font-medium text-gray-700">
                                        {new Date(entry.updated_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
