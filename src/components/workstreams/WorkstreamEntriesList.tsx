'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Edit2, Trash2, Clock, User, Package, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  const [collapsedVerticals, setCollapsedVerticals] = useState<Set<string>>(new Set())
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const toggleVertical = (id: string) => {
    setCollapsedVerticals((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleEntry = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const entriesByVertical = entries.reduce((acc, entry) => {
    const verticalId = entry.vertical_id || 'uncategorized'
    if (!acc[verticalId]) acc[verticalId] = []
    acc[verticalId].push(entry)
    return acc
  }, {} as Record<string, WorkstreamEntryWithDetails[]>)

  const getRollup = (verticalId: string) =>
    verticalRollups.find((r) => r.vertical_id === verticalId)

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
        <p className="text-lg font-medium text-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {verticals.map((vertical) => {
        const verticalEntries = entriesByVertical[vertical.id] || []
        const rollup = getRollup(vertical.id)
        if (verticalEntries.length === 0) return null

        const isCollapsed = collapsedVerticals.has(vertical.id)

        return (
          <div key={vertical.id} className="border border-border rounded-lg overflow-hidden bg-card">
            {/* Vertical Header */}
            <button
              onClick={() => toggleVertical(vertical.id)}
              className="w-full bg-secondary/60 hover:bg-secondary/80 transition-colors px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div
                  className="h-5 w-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: vertical.color || '#3B82F6' }}
                />
                <div className="text-left">
                  <h4 className="font-semibold text-sm text-foreground">{vertical.name}</h4>
                  {vertical.description && (
                    <p className="text-xs text-muted-foreground">{vertical.description}</p>
                  )}
                </div>
              </div>
              {rollup && <VerticalStatusBadge rollup={rollup} showCounts={true} />}
            </button>

            {/* Entries */}
            {!isCollapsed && (
              <div className="divide-y divide-border">
                {verticalEntries.map((entry) => {
                  const isExpanded = expandedEntries.has(entry.id)

                  return (
                    <div key={entry.id}>
                      {/* Entry Row */}
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 cursor-pointer transition-colors"
                        onClick={() => toggleEntry(entry.id)}
                      >
                        {/* Status dot */}
                        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isAdmin && onStatusChange ? (
                            <Select
                              value={entry.status}
                              onValueChange={(value) => onStatusChange(entry, value as WorkstreamStatus)}
                            >
                              <SelectTrigger className="h-auto text-xs px-2 py-1 w-auto border-0 bg-transparent shadow-none">
                                <WorkstreamStatusBadge status={entry.status} size="sm" showLabel={false} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="green">Active</SelectItem>
                                <SelectItem value="yellow">Resolving</SelectItem>
                                <SelectItem value="red">Blocked</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <WorkstreamStatusBadge status={entry.status} size="sm" showLabel={false} />
                          )}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">{entry.name}</span>
                        </div>

                        {/* Inline metadata pills */}
                        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                          {entry.timing && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-foreground/70">
                              {entry.timing}
                            </span>
                          )}
                          {entry.point_person && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-foreground/70 max-w-[120px] truncate">
                              {entry.point_person.full_name}
                            </span>
                          )}
                          {entry.associated_software && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              {entry.associated_software}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        {isAdmin && (
                          <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {onEditEntry && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditEntry(entry)}>
                                <Edit2 className="h-3.5 w-3.5 text-foreground/60" />
                              </Button>
                            )}
                            {onDeleteEntry && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50" onClick={() => onDeleteEntry(entry)}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Expand chevron */}
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 ml-9 border-primary/15 ml-[2.1rem]">
                          {/* Mobile metadata (hidden on desktop) */}
                          <div className="flex flex-wrap gap-1.5 mb-3 sm:hidden">
                            {entry.timing && (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Clock className="h-3 w-3" />{entry.timing}
                              </Badge>
                            )}
                            {entry.point_person ? (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <User className="h-3 w-3" />{entry.point_person.full_name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />Unassigned
                              </Badge>
                            )}
                            {entry.associated_software && (
                              <Badge variant="outline" className="gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <Package className="h-3 w-3" />{entry.associated_software}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-3 text-sm">
                            {entry.description && (
                              <div>
                                <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</h6>
                                <p className="text-foreground/80 leading-relaxed">{entry.description}</p>
                              </div>
                            )}
                            {entry.notes && (
                              <div>
                                <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</h6>
                                <p className="text-foreground/80 bg-secondary/30 rounded p-2.5 leading-relaxed">{entry.notes}</p>
                              </div>
                            )}
                            {entry.custom_sop && (
                              <div>
                                <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">SOP</h6>
                                <div className="text-foreground/80 bg-secondary/30 rounded p-2.5 max-h-40 overflow-y-auto">
                                  {typeof entry.custom_sop === 'string' ? (
                                    <p className="whitespace-pre-wrap leading-relaxed">{entry.custom_sop}</p>
                                  ) : (
                                    <pre className="text-xs font-mono">{JSON.stringify(entry.custom_sop, null, 2)}</pre>
                                  )}
                                </div>
                              </div>
                            )}
                            {!entry.description && !entry.notes && !entry.custom_sop && (
                              <p className="text-xs text-muted-foreground italic">No additional details</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-2">
                              {entry.template && (
                                <span>From: <span className="font-medium text-foreground/70">{entry.template.name}</span></span>
                              )}
                              <span>Created {new Date(entry.created_at).toLocaleDateString()}</span>
                              <span>Updated {new Date(entry.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
