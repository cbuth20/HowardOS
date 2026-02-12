import { WorkstreamStatus } from '@/types/entities'

interface WorkstreamStatusBadgeProps {
  status: WorkstreamStatus
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const statusConfig = {
  red: {
    label: 'Blocked',
    description: 'Blocked / Needs Attention',
    color: 'bg-red-500',
    textColor: 'text-white',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500',
  },
  yellow: {
    label: 'Resolving',
    description: 'In Progress / Resolving',
    color: 'bg-yellow-500',
    textColor: 'text-white',
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-500',
  },
  green: {
    label: 'Active',
    description: 'Active / On Track',
    color: 'bg-green-500',
    textColor: 'text-white',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500',
  },
}

const sizeConfig = {
  sm: {
    dot: 'h-2 w-2',
    badge: 'px-2 py-0.5 text-xs',
  },
  md: {
    dot: 'h-3 w-3',
    badge: 'px-2.5 py-1 text-sm',
  },
  lg: {
    dot: 'h-4 w-4',
    badge: 'px-3 py-1.5 text-base',
  },
}

export function WorkstreamStatusBadge({
  status,
  size = 'md',
  showLabel = false,
  className,
}: WorkstreamStatusBadgeProps) {
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]

  if (showLabel) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeStyles.badge} ${config.bgColor} ${config.borderColor} ${config.textColor} ${className || ''}`}
      >
        {/* <span className={`rounded-full ${sizeStyles.dot} ${config.color}`} /> */}
        <span className="text-[12px]">{config.label}</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-block rounded-full ${sizeStyles.dot} ${config.color} ${className || ''}`}
      title={`${config.label} - ${config.description}`}
    />
  )
}
