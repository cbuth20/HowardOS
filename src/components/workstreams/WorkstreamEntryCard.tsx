'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, User, Package, Edit2, Trash2 } from 'lucide-react'
import { WorkstreamEntryWithDetails, WorkstreamStatus } from '@/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface WorkstreamEntryCardProps {
  entry: WorkstreamEntryWithDetails
  isAdmin?: boolean
  onEdit?: (entry: WorkstreamEntryWithDetails) => void
  onDelete?: (entry: WorkstreamEntryWithDetails) => void
  onStatusChange?: (entry: WorkstreamEntryWithDetails, newStatus: WorkstreamStatus) => void
}

export function WorkstreamEntryCard({
  entry,
  isAdmin = false,
  onEdit,
  onDelete,
  onStatusChange,
}: WorkstreamEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Status Badge */}
          <div className="flex-shrink-0">
            {isAdmin && onStatusChange ? (
              <Select
                value={entry.status}
                onValueChange={(value) => onStatusChange(entry, value as WorkstreamStatus)}
              >
                <SelectTrigger className="h-7 w-auto text-xs rounded-full border-0 font-medium cursor-pointer focus:ring-2 focus:ring-primary" onClick={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Active</SelectItem>
                  <SelectItem value="yellow">Resolving</SelectItem>
                  <SelectItem value="red">Blocked</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <WorkstreamStatusBadge status={entry.status} size="md" showLabel={true} />
            )}
          </div>

          {/* Entry Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-foreground">{entry.name}</h4>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(entry)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title="Edit entry"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(entry)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      title="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80 mt-2">
              {entry.timing && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {entry.timing}
                </span>
              )}

              {entry.point_person && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {entry.point_person.full_name}
                </span>
              )}

              {entry.associated_software && (
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {entry.associated_software}
                </span>
              )}
            </div>

            {/* Short description or expand button */}
            {(entry.description || entry.notes || entry.custom_sop) && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 flex items-center gap-1 p-0 h-auto"
              >
                {isExpanded ? (
                  <>
                    <span>Show less</span>
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Show details</span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border p-4 bg-secondary space-y-3">
          {/* Description */}
          {entry.description && (
            <div>
              <h5 className="text-sm font-medium text-foreground/80 mb-1">Description</h5>
              <p className="text-sm text-foreground/80">{entry.description}</p>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div>
              <h5 className="text-sm font-medium text-foreground/80 mb-1">Notes</h5>
              <p className="text-sm text-foreground/80 bg-card rounded p-2 border border-border">
                {entry.notes}
              </p>
            </div>
          )}

          {/* SOP */}
          {entry.custom_sop && (
            <div>
              <h5 className="text-sm font-medium text-foreground/80 mb-1">SOP</h5>
              <div className="text-sm text-foreground/80 bg-card rounded p-2 border border-border">
                {typeof entry.custom_sop === 'string' ? (
                  <p>{entry.custom_sop}</p>
                ) : (
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(entry.custom_sop, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
