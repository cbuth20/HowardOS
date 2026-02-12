'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, User, Package } from 'lucide-react'
import { WorkstreamEntryWithDetails } from '@/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'

interface WorkstreamCardProps {
  workstream: WorkstreamEntryWithDetails
}

export function WorkstreamCard({ workstream }: WorkstreamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
      {/* Card Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4 flex items-start gap-4 hover:bg-secondary transition-colors"
      >
        <WorkstreamStatusBadge status={workstream.status} size="md" showLabel={true} />

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground mb-1">
            {workstream.name}
          </h4>

          <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80">
            {workstream.vertical && (
              <span className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: workstream.vertical.color || '#3B82F6' }}
                />
                {workstream.vertical.name}
              </span>
            )}

            {workstream.timing && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {workstream.timing}
              </span>
            )}

            {workstream.point_person && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {workstream.point_person.full_name}
              </span>
            )}

            {workstream.associated_software && (
              <span className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                {workstream.associated_software}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border p-4 bg-secondary space-y-4">
          {/* Description */}
          {workstream.description && (
            <div>
              <h4 className="text-sm font-medium text-foreground/80 mb-1">Description</h4>
              <p className="text-sm text-foreground/80">{workstream.description}</p>
            </div>
          )}

          {/* Status Legend */}
          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-2">Status Guide</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <WorkstreamStatusBadge status="green" size="sm" />
                <span className="text-foreground/80">On track - no issues</span>
              </div>
              <div className="flex items-center gap-2">
                <WorkstreamStatusBadge status="yellow" size="sm" />
                <span className="text-foreground/80">In progress - minor attention needed</span>
              </div>
              <div className="flex items-center gap-2">
                <WorkstreamStatusBadge status="red" size="sm" />
                <span className="text-foreground/80">Issues/blocked - immediate attention required</span>
              </div>
            </div>
          </div>

          {/* Notes (if any) */}
          {workstream.notes && (
            <div>
              <h4 className="text-sm font-medium text-foreground/80 mb-1">Notes</h4>
              <p className="text-sm text-foreground/80 bg-card rounded p-2 border border-border">
                {workstream.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
