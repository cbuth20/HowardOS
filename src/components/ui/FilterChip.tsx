interface FilterChipProps {
  label: string
  isActive: boolean
  onClick: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
  count?: number
}

interface FilterChipGroupProps {
  children: React.ReactNode
  label?: string
}

export function FilterChip({
  label,
  isActive,
  onClick,
  size = 'md',
  disabled = false,
  count,
}: FilterChipProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-full font-medium transition-colors whitespace-nowrap
        ${sizeClasses}
        ${
          isActive
            ? 'bg-brand-primary/10 border border-brand-primary/40 text-brand-primary'
            : 'bg-white border border-neutral-border text-text-secondary hover:bg-background-hover'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {label}
      {count !== undefined && ` (${count})`}
    </button>
  )
}

export function FilterChipGroup({ children, label }: FilterChipGroupProps) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs text-text-muted uppercase font-medium">{label}</span>
      )}
      {children}
    </div>
  )
}
