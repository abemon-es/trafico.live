import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface UseActiveDescendantOptions<T> {
  items: readonly T[]
  getId: (item: T, index: number) => string
  enabled?: boolean
  loop?: boolean
  onSelect?: (item: T, index: number) => void
}

export interface UseActiveDescendantResult {
  activeIndex: number
  activeId: string | undefined
  setActiveIndex: (index: number) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
  reset: () => void
}

export function useActiveDescendant<T>({
  items,
  getId,
  enabled = true,
  loop = true,
  onSelect,
}: UseActiveDescendantOptions<T>): UseActiveDescendantResult {
  const [activeIndex, setActiveIndexState] = useState(-1)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndexState(items.length > 0 ? 0 : -1)
    }
  }, [items.length, activeIndex])

  const activeId = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= items.length) return undefined
    return getId(items[activeIndex], activeIndex)
  }, [activeIndex, items, getId])

  const setActiveIndex = useCallback((index: number) => {
    setActiveIndexState(index)
  }, [])

  const reset = useCallback(() => setActiveIndexState(-1), [])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!enabled) return
      const count = itemsRef.current.length
      if (count === 0) return

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          setActiveIndexState((prev) => {
            const next = prev + 1
            if (next >= count) return loop ? 0 : count - 1
            return next
          })
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          setActiveIndexState((prev) => {
            if (prev <= 0) return loop ? count - 1 : 0
            return prev - 1
          })
          break
        }
        case 'Home': {
          event.preventDefault()
          setActiveIndexState(0)
          break
        }
        case 'End': {
          event.preventDefault()
          setActiveIndexState(count - 1)
          break
        }
        case 'Enter': {
          if (activeIndex >= 0 && activeIndex < count && onSelect) {
            event.preventDefault()
            onSelect(itemsRef.current[activeIndex], activeIndex)
          }
          break
        }
        case 'Escape': {
          setActiveIndexState(-1)
          break
        }
      }
    },
    [activeIndex, enabled, loop, onSelect],
  )

  return { activeIndex, activeId, setActiveIndex, onKeyDown, reset }
}
