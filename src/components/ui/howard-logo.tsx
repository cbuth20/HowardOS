import { cn } from '@/lib/utils'

interface HowardLogoProps {
  className?: string
  variant?: 'full' | 'icon'
  showText?: boolean
}

function HowardLogo({ className, variant = 'full', showText = true }: HowardLogoProps) {
  if (variant === 'icon') {
    return (
      <img
        src="/icons/h-mark.svg"
        alt="Howard"
        width={40}
        height={40}
        className={className}
      />
    )
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src="/icons/h-mark.svg"
        alt="Howard"
        width={40}
        height={40}
        className="w-10 h-10"
      />
      {showText && (
        <div className="flex flex-col">
          <span className="text-2xl font-serif italic text-foreground leading-none">
            Howard
          </span>
          <span className="text-xs font-mono text-muted-foreground tracking-wider uppercase">
            Financial Services
          </span>
        </div>
      )}
    </div>
  )
}

export { HowardLogo }
