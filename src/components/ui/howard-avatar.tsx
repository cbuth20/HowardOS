'use client'

import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface HowardAvatarProps {
  name: string
  email?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  role?: string
  src?: string
  className?: string
}

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
}

const roleColors: Record<string, string> = {
  admin: 'bg-howard-ink text-howard-parchment',
  manager: 'bg-howard-ink text-howard-parchment',
  user: 'bg-howard-slate text-howard-parchment',
  client: 'bg-howard-slate text-howard-parchment',
  client_no_access: 'bg-muted text-muted-foreground',
  default: 'bg-primary text-primary-foreground',
}

function HowardAvatar({ name, email, size = 'md', role, src, className }: HowardAvatarProps) {
  const colorClass = role ? roleColors[role] : roleColors.default

  return (
    <Avatar className={cn(sizeClasses[size], 'flex-shrink-0', className)} title={email || name}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className={cn(colorClass, 'font-semibold')}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

interface AvatarGroupProps {
  users: Array<{
    name: string
    email?: string
    role?: string
    src?: string
  }>
  max?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

function AvatarGroup({ users, max = 3, size = 'md', className }: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max)
  const remaining = users.length - max

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleUsers.map((user, index) => (
        <HowardAvatar
          key={index}
          name={user.name}
          email={user.email}
          role={user.role}
          src={user.src}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {remaining > 0 && (
        <Avatar className={cn(sizeClasses[size], 'ring-2 ring-background flex-shrink-0')} title={`+${remaining} more`}>
          <AvatarFallback className="bg-secondary text-muted-foreground font-semibold">
            +{remaining}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

export { HowardAvatar, AvatarGroup }
export type { HowardAvatarProps, AvatarGroupProps }
