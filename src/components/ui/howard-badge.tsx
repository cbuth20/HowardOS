import * as React from 'react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type HowardBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'role-admin'
  | 'role-manager'
  | 'role-user'
  | 'role-client'
  | 'role-client_no_access'
  | 'status-active'
  | 'status-inactive'
  | 'status-pending'
  | 'priority-high'
  | 'priority-medium'
  | 'priority-low'
  | 'workstream-on-track'
  | 'workstream-at-risk'
  | 'workstream-behind'
  | 'workstream-complete'
  | 'workstream-not-started'

interface HowardBadgeProps extends Omit<BadgeProps, 'variant'> {
  variant?: HowardBadgeVariant
}

const variantStyles: Record<HowardBadgeVariant, string> = {
  default: '',
  secondary: '',
  destructive: '',
  outline: '',
  'role-admin': 'bg-howard-ink text-howard-parchment border-transparent',
  'role-manager': 'bg-howard-ink/80 text-howard-parchment border-transparent',
  'role-user': 'bg-howard-slate text-howard-parchment border-transparent',
  'role-client': 'bg-howard-slate/20 text-howard-slate border-transparent',
  'role-client_no_access': 'bg-muted text-muted-foreground border-transparent',
  'status-active': 'bg-primary/10 text-primary border-primary/20',
  'status-inactive': 'bg-muted text-muted-foreground border-transparent',
  'status-pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'priority-high': 'bg-destructive/10 text-destructive border-destructive/20',
  'priority-medium': 'bg-amber-50 text-amber-700 border-amber-200',
  'priority-low': 'bg-muted text-muted-foreground border-transparent',
  'workstream-on-track': 'bg-primary/10 text-primary border-primary/20',
  'workstream-at-risk': 'bg-amber-50 text-amber-700 border-amber-200',
  'workstream-behind': 'bg-destructive/10 text-destructive border-destructive/20',
  'workstream-complete': 'bg-primary/15 text-primary border-primary/30 font-semibold',
  'workstream-not-started': 'bg-muted text-muted-foreground border-transparent',
}

const shadcnVariantMap: Record<string, BadgeProps['variant']> = {
  default: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
  outline: 'outline',
}

function HowardBadge({ variant = 'default', className, ...props }: HowardBadgeProps) {
  const shadcnVariant = shadcnVariantMap[variant] || 'outline'
  const customStyle = variantStyles[variant]

  return (
    <Badge
      variant={shadcnVariant}
      className={cn(customStyle, className)}
      {...props}
    />
  )
}

export { HowardBadge }
export type { HowardBadgeProps, HowardBadgeVariant }
