import { WorkstreamStatus, VerticalStatusRollup } from '@howard/ui/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'

interface VerticalStatusBadgeProps {
  rollup: VerticalStatusRollup
  showCounts?: boolean
  className?: string
}

export function VerticalStatusBadge({
  rollup,
  showCounts = true,
  className,
}: VerticalStatusBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className || ''}`}>
      <WorkstreamStatusBadge
        status={rollup.rollup_status}
        size="sm"
        showLabel={true}
      />

      {showCounts && (
        <div className="flex items-center gap-1.5 text-xs text-foreground/80">
          <span className="font-medium">{rollup.total_entries}</span>
          <span>entries:</span>
          {rollup.red_count > 0 && (
            <span className="text-red-600 font-medium">{rollup.red_count} red</span>
          )}
          {rollup.yellow_count > 0 && (
            <span className="text-yellow-600 font-medium">{rollup.yellow_count} yellow</span>
          )}
          {rollup.green_count > 0 && (
            <span className="text-green-600 font-medium">{rollup.green_count} green</span>
          )}
        </div>
      )}
    </div>
  )
}
