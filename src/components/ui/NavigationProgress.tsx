'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    // Start the progress bar
    setIsNavigating(true)

    // Complete the progress bar after a short delay
    const timer = setTimeout(() => {
      setIsNavigating(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  if (!isNavigating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-neutral-200">
      <div className="h-full bg-brand-primary animate-progress-bar origin-left" />
    </div>
  )
}
