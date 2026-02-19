import { WorkstreamStatus, VerticalStatusRollup } from '@howard/ui/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'

interface WorkstreamStatusRollupProps {
  overallStatus: WorkstreamStatus
  verticalRollups: VerticalStatusRollup[]
  totalEntries: number
  className?: string
}

export function WorkstreamStatusRollup({
  overallStatus,
  verticalRollups,
  totalEntries,
  className,
}: WorkstreamStatusRollupProps) {
  // Calculate totals
  const totalRed = verticalRollups.reduce((sum, r) => sum + r.red_count, 0)
  const totalYellow = verticalRollups.reduce((sum, r) => sum + r.yellow_count, 0)
  const totalGreen = verticalRollups.reduce((sum, r) => sum + r.green_count, 0)

  return (
    <div className={`${className || ''}`}>
      {/* Compact Status Display */}
      <div className="flex items-center gap-4 pt-3 border-t border-border">
        {/* Overall Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <WorkstreamStatusBadge status={overallStatus} size="sm" showLabel={true} />
        </div>

        {/* Status Counts */}
        <div className="flex items-center gap-3 text-xs">
          {totalRed > 0 && (
            <div className="flex items-center gap-1">
              <WorkstreamStatusBadge status="red" size="sm" />
              <span className="font-semibold text-red-600">{totalRed}</span>
            </div>
          )}
          {totalYellow > 0 && (
            <div className="flex items-center gap-1">
              <WorkstreamStatusBadge status="yellow" size="sm" />
              <span className="font-semibold text-yellow-600">{totalYellow}</span>
            </div>
          )}
          {totalGreen > 0 && (
            <div className="flex items-center gap-1">
              <WorkstreamStatusBadge status="green" size="sm" />
              <span className="font-semibold text-green-600">{totalGreen}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {totalEntries > 0 && (
          <div className="flex-1 max-w-xs">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
              {totalRed > 0 && (
                <div
                  className="bg-red-500"
                  style={{ width: `${(totalRed / totalEntries) * 100}%` }}
                  title={`${totalRed} red (${Math.round((totalRed / totalEntries) * 100)}%)`}
                />
              )}
              {totalYellow > 0 && (
                <div
                  className="bg-yellow-500"
                  style={{ width: `${(totalYellow / totalEntries) * 100}%` }}
                  title={`${totalYellow} yellow (${Math.round((totalYellow / totalEntries) * 100)}%)`}
                />
              )}
              {totalGreen > 0 && (
                <div
                  className="bg-green-500"
                  style={{ width: `${(totalGreen / totalEntries) * 100}%` }}
                  title={`${totalGreen} green (${Math.round((totalGreen / totalEntries) * 100)}%)`}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
