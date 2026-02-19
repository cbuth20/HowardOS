import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Users,
  Building2,
  ClipboardList,
  Wrench,
  ArrowLeftRight,
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
    label: 'Files',
    href: '/files',
    icon: FolderOpen,
    roles: ['admin', 'manager', 'user', 'client'],
  },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
    roles: ['admin', 'manager', 'user', 'client'],
  },
  {
    label: 'Workstreams',
    href: '/workstreams',
    icon: ClipboardList,
    roles: ['admin', 'manager', 'user', 'client'],
  },
  {
    label: 'Tools',
    href: '/tools/transactions',
    icon: Wrench,
    roles: ['admin'],
    children: [
      {
        label: 'Transactions',
        href: '/tools/transactions',
        icon: ArrowLeftRight,
        roles: ['admin'],
      },
    ],
  },
  {
    label: 'Clients',
    href: '/clients/organizations',
    icon: Users,
    roles: ['admin', 'manager', 'client', 'client_no_access'],
    children: [
      {
        label: 'Organizations',
        href: '/clients/organizations',
        icon: Building2,
        roles: ['admin', 'manager', 'client', 'client_no_access'],
      },
      {
        label: 'Users',
        href: '/clients/users',
        icon: Users,
        roles: ['admin', 'manager', 'client', 'client_no_access'],
      },
    ],
  },
]

const isDev = import.meta.env.DEV

export const appLinks: AppLink[] = [
  {
    label: 'Howard CRM',
    href: isDev ? 'http://localhost:8889' : 'https://howard-crm.netlify.app',
  },
  {
    label: 'Howard University',
    href: isDev ? 'http://localhost:8890' : 'https://howard-uni.netlify.app',
  },
]
