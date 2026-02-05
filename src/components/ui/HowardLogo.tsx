import Image from 'next/image'

interface HowardLogoProps {
  className?: string
  variant?: 'full' | 'icon'
  showText?: boolean
}

export function HowardLogo({ className = '', variant = 'full', showText = true }: HowardLogoProps) {
  if (variant === 'icon') {
    return (
      <Image
        src="/icons/h-mark.svg"
        alt="Howard"
        width={40}
        height={40}
        className={className}
      />
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <Image
        src="/icons/h-mark.svg"
        alt="Howard"
        width={40}
        height={40}
        className="w-10 h-10"
      />

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className="text-2xl font-bold font-serif text-brand-navy leading-none">
            Howard
          </span>
          <span className="text-xs text-text-muted tracking-wider uppercase">
            Financial Services
          </span>
        </div>
      )}
    </div>
  )
}
