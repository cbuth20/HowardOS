'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hideCloseButton?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  hideCloseButton = false,
}: ModalProps) {
  // Close on escape key (but not if hideCloseButton is true)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hideCloseButton) onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, hideCloseButton])

  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm"
        onClick={hideCloseButton ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-lg shadow-xl border border-neutral-border w-full ${sizeStyles[size]} max-h-[90vh] overflow-hidden flex flex-col`}
        role="dialog"
        aria-modal="true"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-neutral-border bg-white">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {children}
        </div>
      </div>
    </div>
  )
}

export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`flex items-center justify-end gap-3 p-6 border-t border-neutral-border ${className}`}>
      {children}
    </div>
  )
}
