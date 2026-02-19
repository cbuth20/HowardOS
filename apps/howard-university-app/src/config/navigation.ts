import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Library,
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
    label: 'Courses',
    href: '/courses',
    icon: BookOpen,
    roles: ['admin', 'manager', 'user', 'client'],
  },
  {
    label: 'Students',
    href: '/students',
    icon: GraduationCap,
    roles: ['admin', 'manager'],
  },
  {
    label: 'Library',
    href: '/library',
    icon: Library,
    roles: ['admin', 'manager', 'user', 'client'],
  },
]

const isDev = import.meta.env.DEV

export const appLinks: AppLink[] = [
  {
    label: 'HowardOS',
    href: isDev ? 'http://localhost:8888' : 'https://howard-os1.netlify.app',
  },
  {
    label: 'Howard CRM',
    href: isDev ? 'http://localhost:8889' : 'https://howard-crm.netlify.app',
  },
]
