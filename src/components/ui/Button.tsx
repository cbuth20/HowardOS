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
    // Primary: High contrast sage green with white text
    // primary: 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm hover:shadow-md focus:ring-brand-primary',
    primary: 'bg-brand-navy text-white hover:bg-brand-navy/90 shadow-sm hover:shadow-md focus:ring-brand-navy',

    // Secondary: Navy background with white text
    secondary: 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm hover:shadow-md focus:ring-brand-primary',

    // Destructive: Error red with white text
    destructive: 'bg-state-error text-white hover:bg-state-error/90 shadow-sm hover:shadow-md focus:ring-state-error',

    // Ghost: Transparent with subtle hover
    ghost: 'text-text-primary hover:bg-background-hover hover:text-brand-navy focus:ring-brand-primary',

    // Outline: Border style for secondary actions
    outline: 'border-2 border-neutral-border text-text-primary hover:border-brand-primary hover:bg-background-hover hover:text-brand-navy focus:ring-brand-primary',
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
