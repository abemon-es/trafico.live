'use client'

import { useEffect, useRef, useState } from 'react'

export interface LiveRegionProps {
  message: string
  politeness?: 'polite' | 'assertive'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  clearAfter?: number
}

export function LiveRegion({
  message,
  politeness = 'polite',
  atomic = true,
  relevant = 'additions',
  clearAfter,
}: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState(message)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setAnnouncement(message)
    if (!clearAfter || !message) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setAnnouncement(''), clearAfter)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [message, clearAfter])

  return (
    <div
      className="sr-only"
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
    >
      {announcement}
    </div>
  )
}

export interface AnnouncerHandle {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void
}

export function useAnnouncer(): [
  React.ReactElement,
  (message: string, politeness?: 'polite' | 'assertive') => void,
] {
  const [state, setState] = useState<{
    message: string
    politeness: 'polite' | 'assertive'
    key: number
  }>({ message: '', politeness: 'polite', key: 0 })

  const announce = (
    message: string,
    politeness: 'polite' | 'assertive' = 'polite',
  ) => {
    setState((prev) => ({ message, politeness, key: prev.key + 1 }))
  }

  const node = (
    <LiveRegion
      key={state.key}
      message={state.message}
      politeness={state.politeness}
      clearAfter={5000}
    />
  )

  return [node, announce]
}
