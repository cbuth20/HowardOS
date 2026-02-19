import {
  LayoutDashboard,
  Contact,
  Handshake,
  GitBranch,
} from 'lucide-react'
import type { NavItem, AppLink } from '@howard/ui/types/navigation'

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'user', 'client'],
  },
  {
    label: 'Contacts',
    href: '/contacts',
    icon: Contact,
    roles: ['admin', 'manager', 'user'],
  },
  {
    label: 'Deals',
    href: '/deals',
    icon: Handshake,
    roles: ['admin', 'manager', 'user'],
  },
  {
    label: 'Pipeline',
    href: '/pipeline',
    icon: GitBranch,
    roles: ['admin', 'manager'],
  },
]

const isDev = import.meta.env.DEV

export const appLinks: AppLink[] = [
  {
    label: 'HowardOS',
    href: isDev ? 'http://localhost:8888' : 'https://howard-os1.netlify.app',
  },
  {
    label: 'Howard University',
    href: isDev ? 'http://localhost:8890' : 'https://howard-uni.netlify.app',
  },
]
