"use client";

/**
 * ChatPanel — the main chat drawer content.
 * Renders messages list, input area, and streaming state.
 * Animated with motion/react (spring, respects prefers-reduced-motion).
 */

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, RotateCcw, AlertCircle } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useChat } from "./useChat";

// ─── Props ───────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
}

// ─── Panel animations ─────────────────────────────────────────────────────────

const panelVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 35 },
  },
};

const reducedPanelVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatPanel({ isOpen, onClose, conversationId }: ChatPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const { messages, send, isStreaming, error, clearError, reset } = useChat({
    conversationId,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth" });
  }, [messages, shouldReduceMotion]);

  // Focus trap: close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const variants = shouldReduceMotion ? reducedPanelVariants : panelVariants;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="chat-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="chat-panel"
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Asistente de trafico.live"
            className="fixed bottom-0 right-0 z-50 flex flex-col bg-white dark:bg-gray-950 shadow-2xl border-l border-t border-tl-100 dark:border-tl-800/50 rounded-tl-2xl
              w-full sm:w-[400px] sm:rounded-tl-2xl
              h-[85dvh] sm:h-[600px] sm:bottom-4 sm:right-4"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-tl-100 dark:border-tl-800/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                {/* Pulse indicator */}
                <span className="relative flex w-2 h-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tl-400 opacity-75" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-tl-500" />
                </span>
                <span className="font-heading font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Asistente trafico.live
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Reset conversation */}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    disabled={isStreaming}
                    aria-label="Nueva conversación"
                    title="Nueva conversación"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar asistente"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div
              ref={listRef}
              role="list"
              aria-label="Conversación"
              aria-live="polite"
              aria-atomic="false"
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
            >
              {messages.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-tl-50 dark:bg-tl-900/40 border border-tl-100 dark:border-tl-800 flex items-center justify-center">
                    <span className="text-2xl" role="img" aria-label="Asistente">🚦</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-heading font-semibold text-gray-800 dark:text-gray-200 text-sm">
                      ¿En qué puedo ayudarte?
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Consulta tráfico, trenes, vuelos, barcos,
                      combustible y calidad del aire en España.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                </>
              )}

              <div ref={messagesEndRef} aria-hidden="true" />
            </div>

            {/* ── Error banner ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mx-4 mb-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={clearError}
                      className="text-[10px] underline text-red-600 dark:text-red-400 mt-0.5 hover:no-underline"
                    >
                      Cerrar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Input ── */}
            <div className="px-4 pb-4 pt-2 border-t border-tl-100 dark:border-tl-800/50 flex-shrink-0">
              <ChatInput
                onSend={send}
                isStreaming={isStreaming}
                isEmpty={messages.length === 0}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
