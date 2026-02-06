'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'

interface DashboardLayoutClientProps {
  userRole?: 'admin' | 'client'
  orgName?: string
  userName?: string
  userEmail: string
  userAvatar?: string | null
  children: React.ReactNode
}

export function DashboardLayoutClient({
  userRole,
  orgName,
  userName,
  userEmail,
  userAvatar,
  children,
}: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        userRole={userRole}
        orgName={orgName}
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
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
