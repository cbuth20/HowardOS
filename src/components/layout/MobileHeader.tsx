'use client'

import { Menu } from 'lucide-react'
import { HowardLogo } from '@/components/ui/howard-logo'
import { Button } from '@/components/ui/button'

interface MobileHeaderProps {
  onMenuClick: () => void
  orgName?: string
}

export function MobileHeader({ onMenuClick, orgName }: MobileHeaderProps) {
  return (
    <div className="md:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
      <Button
        onClick={onMenuClick}
        variant="ghost"
        size="icon"
        className="flex-shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </Button>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <HowardLogo className="w-6 h-6 flex-shrink-0" />
        {orgName && (
          <span className="text-sm font-medium text-foreground truncate">
            {orgName}
          </span>
        )}
      </div>
    </div>
  )
}
