'use client'

import * as React from 'react'
import { Button } from './button'
import { cn } from '../../lib/utils'

interface FilterChipProps {
  label: string
  isActive: boolean
  onClick: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
  count?: number
}

function FilterChip({
  label,
  isActive,
  onClick,
  size = 'md',
  disabled = false,
  count,
}: FilterChipProps) {
  return (
    <Button
      type="button"
      variant={isActive ? 'default' : 'outline'}
      size={size === 'sm' ? 'sm' : 'default'}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-full whitespace-nowrap',
        isActive
          ? 'bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20'
          : 'bg-card border border-border text-muted-foreground hover:bg-secondary'
      )}
    >
      {label}
      {count !== undefined && ` (${count})`}
    </Button>
  )
}

interface FilterChipGroupProps {
  children: React.ReactNode
  label?: string
}

function FilterChipGroup({ children, label }: FilterChipGroupProps) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs text-muted-foreground uppercase font-medium">{label}</span>
      )}
      {children}
    </div>
  )
}

export { FilterChip, FilterChipGroup }
