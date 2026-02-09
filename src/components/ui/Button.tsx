import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    // Primary: Deep sage for call-to-action buttons
    primary: 'bg-action-primary text-white hover:bg-action-primary-hover shadow-sm hover:shadow-md focus:ring-action-primary',

    // Secondary: Light mint sage for secondary actions
    secondary: 'bg-[#95CBA7] text-white hover:bg-[#7FBC94] shadow-sm hover:shadow-md focus:ring-[#95CBA7]',

    // Destructive: Error red with white text
    destructive: 'bg-state-error text-white hover:bg-state-error/90 shadow-sm hover:shadow-md focus:ring-state-error',

    // Ghost: Transparent with subtle hover
    ghost: 'text-text-primary hover:bg-background-hover hover:text-brand-navy focus:ring-action-primary',

    // Outline: Border style for secondary actions
    outline: 'border-2 border-neutral-border text-text-primary hover:border-action-primary hover:bg-background-hover hover:text-action-primary focus:ring-action-primary',
  }

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[40px]',
    lg: 'px-6 py-3 text-base min-h-[44px]',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
