import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )
  return nodes.filter(
    (node) =>
      !node.hasAttribute('disabled') &&
      node.offsetWidth > 0 &&
      node.offsetHeight > 0,
  )
}

export interface UseFocusTrapOptions {
  active: boolean
  onEscape?: () => void
  initialFocus?: 'first' | 'container'
  returnFocus?: boolean
}

export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions,
) {
  const containerRef = useRef<T | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!options.active) return
    const container = containerRef.current
    if (!container) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    const focusables = getFocusable(container)
    if (options.initialFocus === 'container' || focusables.length === 0) {
      container.setAttribute('tabindex', '-1')
      container.focus({ preventScroll: true })
    } else {
      focusables[0].focus({ preventScroll: true })
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && options.onEscape) {
        event.stopPropagation()
        options.onEscape()
        return
      }
      if (event.key !== 'Tab') return

      const nodes = getFocusable(container!)
      if (nodes.length === 0) {
        event.preventDefault()
        return
      }

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      if (options.returnFocus !== false && previouslyFocused.current) {
        previouslyFocused.current.focus({ preventScroll: true })
      }
    }
  }, [options.active, options.onEscape, options.initialFocus, options.returnFocus])

  return containerRef
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return getFocusable(container)
}
