'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import type { NavItem, AppLink } from '../../types/navigation'

export interface UserOrgInfo {
  orgId: string
  orgName: string
  orgSlug: string
  isPrimary: boolean
}

interface DashboardLayoutClientProps {
  userRole?: string
  orgName?: string
  userName?: string
  userEmail: string
  userAvatar?: string | null
  userOrgs?: UserOrgInfo[]
  navItems: NavItem[]
  appLinks?: AppLink[]
  children: React.ReactNode
}

export function DashboardLayoutClient({
  userRole,
  orgName,
  userName,
  userEmail,
  userAvatar,
  userOrgs = [],
  navItems,
  appLinks = [],
  children,
}: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-card">
      <Sidebar
        userRole={userRole}
        orgName={orgName}
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
        userOrgs={userOrgs}
        navItems={navItems}
        appLinks={appLinks}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader
          onMenuClick={() => setIsSidebarOpen(true)}
          orgName={orgName}
        />
        {children}
      </main>
    </div>
  )
}
