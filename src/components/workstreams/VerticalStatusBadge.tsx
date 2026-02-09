import { WorkstreamStatus, VerticalStatusRollup } from '@/types/entities'
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
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="font-medium">{rollup.total_entries}</span>
          <span>entries:</span>
          {rollup.red_count > 0 && (
            <span className="text-red-600 font-medium">{rollup.red_count}🔴</span>
          )}
          {rollup.yellow_count > 0 && (
            <span className="text-yellow-600 font-medium">{rollup.yellow_count}🟡</span>
          )}
          {rollup.green_count > 0 && (
            <span className="text-green-600 font-medium">{rollup.green_count}🟢</span>
          )}
        </div>
      )}
    </div>
  )
}
