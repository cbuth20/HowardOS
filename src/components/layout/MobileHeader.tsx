'use client'

import { Menu } from 'lucide-react'
import { HowardLogo } from '@/components/ui/HowardLogo'

interface MobileHeaderProps {
  onMenuClick: () => void
  orgName?: string
}

export function MobileHeader({ onMenuClick, orgName }: MobileHeaderProps) {
  return (
    <div className="md:hidden sticky top-0 z-30 bg-white border-b border-neutral-border px-4 py-3 flex items-center gap-3">
      <button
        onClick={onMenuClick}
        className="p-2 hover:bg-neutral-gray-100 rounded-md transition-colors flex-shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-text-secondary" />
      </button>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <HowardLogo className="w-6 h-6 flex-shrink-0" />
        {orgName && (
          <span className="text-sm font-medium text-text-primary truncate">
            {orgName}
          </span>
        )}
      </div>
    </div>
  )
}
