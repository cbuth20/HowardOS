import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles: string[]
  children?: NavItem[]
}

export interface AppLink {
  label: string
  href: string
  description?: string
}
