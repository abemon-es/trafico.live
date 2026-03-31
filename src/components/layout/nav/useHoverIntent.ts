"use client";

import { useRef, useCallback } from "react";

export function useHoverIntent(
  onOpen: () => void,
  onClose: () => void,
  openDelay = 250,
  closeDelay = 400
) {
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    openTimer.current = setTimeout(onOpen, openDelay);
  }, [onOpen, openDelay]);

  const handlePointerLeave = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    closeTimer.current = setTimeout(onClose, closeDelay);
  }, [onClose, closeDelay]);

  const cancelAll = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  return {
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    cancelAll,
  };
}
