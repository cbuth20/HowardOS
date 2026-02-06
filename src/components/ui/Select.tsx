import React from 'react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-2.5 py-1.5 border border-neutral-border rounded-md text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:bg-muted-DEFAULT disabled:cursor-not-allowed ${
            error ? 'border-state-error focus:ring-state-error' : ''
          } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-state-error">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
