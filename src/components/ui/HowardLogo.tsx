interface HowardLogoProps {
  className?: string
  variant?: 'full' | 'icon'
  showText?: boolean
}

export function HowardLogo({ className = '', variant = 'full', showText = true }: HowardLogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* H monogram with clean, geometric design */}
        <rect width="40" height="40" rx="8" fill="#758C7C" />
        <path
          d="M12 10h3v8h7v-8h3v20h-3v-9h-7v9h-3V10z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10"
      >
        <rect width="40" height="40" rx="8" fill="#758C7C" />
        <path
          d="M12 10h3v8h7v-8h3v20h-3v-9h-7v9h-3V10z"
          fill="#FFFFFF"
        />
      </svg>

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
