"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { ChatTrigger } from "./ChatTrigger";
import { ChatPanel } from "./ChatPanel";
import { trackCtaClick } from "@/lib/analytics";
// TODO(S3): when agent A3 adds trackCtaClick, it is already available in src/lib/analytics.ts.
// Fallback: import { trackOutbound } from "@/lib/analytics" if the above import fails.

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    // Track the first open interaction
    trackCtaClick("chat-open", "ChatTrigger", "floating-widget");
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [isOpen, handleOpen, handleClose]);

  return (
    <>
      {/* Panel — conditionally rendered with exit animation */}
      <AnimatePresence>
        {isOpen && <ChatPanel key="chat-panel" onClose={handleClose} />}
      </AnimatePresence>

      {/* Floating action button — always visible */}
      <ChatTrigger onClick={handleToggle} isOpen={isOpen} />
    </>
  );
}

/*
 * INTEGRATION NOTE for T2.3 (layout.tsx owner):
 * ─────────────────────────────────────────────
 * Add <ChatWidget /> to src/app/layout.tsx just before the closing </body> tag.
 *
 * Import:
 *   import { ChatWidget } from "@/components/chat";
 *
 * Placement (inside RootLayout return, after all providers):
 *   ...
 *   <ChatWidget />
 *   </body>
 *
 * The widget is a Client Component and uses AnimatePresence from motion/react.
 * No additional providers required. Renders only on client (fixed positioning).
 */
