import { WorkstreamStatus, VerticalStatusRollup } from '@/types/entities'
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
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className || ''}`}>
      {/* Overall Status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Overall Status
          </h3>
          <WorkstreamStatusBadge status={overallStatus} size="lg" showLabel={true} />
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{totalEntries}</p>
          <p className="text-sm text-gray-500">Total Entries</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Status Breakdown</h4>

        {/* Red */}
        {totalRed > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WorkstreamStatusBadge status="red" size="sm" showLabel={true} />
              <span className="text-sm text-gray-600">Issues/Blocked</span>
            </div>
            <span className="text-sm font-semibold text-red-600">{totalRed}</span>
          </div>
        )}

        {/* Yellow */}
        {totalYellow > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WorkstreamStatusBadge status="yellow" size="sm" showLabel={true} />
              <span className="text-sm text-gray-600">In Progress</span>
            </div>
            <span className="text-sm font-semibold text-yellow-600">{totalYellow}</span>
          </div>
        )}

        {/* Green */}
        {totalGreen > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WorkstreamStatusBadge status="green" size="sm" showLabel={true} />
              <span className="text-sm text-gray-600">On Track</span>
            </div>
            <span className="text-sm font-semibold text-green-600">{totalGreen}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {totalEntries > 0 && (
        <div className="mt-6">
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
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

          <div className="flex justify-between mt-2 text-xs text-gray-500">
            {totalRed > 0 && <span>{Math.round((totalRed / totalEntries) * 100)}% Red</span>}
            {totalYellow > 0 && <span>{Math.round((totalYellow / totalEntries) * 100)}% Yellow</span>}
            {totalGreen > 0 && <span>{Math.round((totalGreen / totalEntries) * 100)}% Green</span>}
          </div>
        </div>
      )}
    </div>
  )
}
