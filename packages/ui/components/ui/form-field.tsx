'use client'

import * as React from 'react'
import { Label } from './label'
import { Input } from './input'
import { Textarea } from './textarea'
import { cn } from '../../lib/utils'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const fieldId = id || props.name
    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={fieldId} className="text-sm font-medium text-foreground">
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          id={fieldId}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
      </div>
    )
  }
)
FormField.displayName = 'FormField'

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const fieldId = id || props.name
    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={fieldId} className="text-sm font-medium text-foreground">
            {label}
          </Label>
        )}
        <Textarea
          ref={ref}
          id={fieldId}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
      </div>
    )
  }
)
FormTextarea.displayName = 'FormTextarea'

export { FormField, FormTextarea }
