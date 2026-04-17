'use client'

import type { ReactNode } from 'react'
import { useFocusTrap } from '@/lib/a11y/focus-trap'

export interface FocusTrapProps {
  active: boolean
  onEscape?: () => void
  initialFocus?: 'first' | 'container'
  returnFocus?: boolean
  className?: string
  role?: string
  ariaLabel?: string
  ariaModal?: boolean
  children: ReactNode
}

export function FocusTrap({
  active,
  onEscape,
  initialFocus = 'first',
  returnFocus = true,
  className,
  role,
  ariaLabel,
  ariaModal,
  children,
}: FocusTrapProps) {
  const ref = useFocusTrap<HTMLDivElement>({
    active,
    onEscape,
    initialFocus,
    returnFocus,
  })

  return (
    <div
      ref={ref}
      className={className}
      role={role}
      aria-label={ariaLabel}
      aria-modal={ariaModal}
    >
      {children}
    </div>
  )
}
