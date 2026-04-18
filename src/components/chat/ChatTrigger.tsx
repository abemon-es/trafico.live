"use client";

import { motion, useReducedMotion } from "motion/react";
import { MessageCircle } from "lucide-react";

interface ChatTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export function ChatTrigger({ onClick, isOpen }: ChatTriggerProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    // Outer wrapper: fixed position anchor
    <div className="fixed bottom-6 right-6 z-50">
      {/* Amber pulse ring — absolutely positioned sibling, CSS animated */}
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        aria-hidden="true"
        style={{
          border: "2px solid var(--color-tl-amber-400)",
          animation: prefersReducedMotion
            ? "none"
            : "tl-ring-pulse 1.8s ease-out infinite",
          opacity: 0,
        }}
      />

      {/* Badge dot — "nueva feature" indicator */}
      <span
        className="absolute top-0 right-0 w-2 h-2 rounded-full z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundColor: "var(--color-tl-amber-500)",
          animation: prefersReducedMotion
            ? "none"
            : "tl-dot-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      />

      {/* Trigger button */}
      <motion.button
        onClick={onClick}
        animate={
          prefersReducedMotion
            ? {}
            : {
                scale: [1, 1.05, 1],
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }
        }
        whileTap={{ scale: 0.95 }}
        aria-label="Abrir asistente"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          backgroundColor: "var(--color-tl-500)",
          // Ring color on focus
          "--tw-ring-color": "var(--color-tl-400)",
        }}
      >
        <MessageCircle
          className="w-6 h-6"
          fill="white"
          stroke="white"
          aria-hidden="true"
        />
      </motion.button>

      {/* Animation keyframes — inlined to avoid globals.css modification */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes tl-ring-pulse {
            0%   { opacity: 0.7; transform: scale(1); }
            100% { opacity: 0;   transform: scale(1.5); }
          }
          @keyframes tl-dot-pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
        }
      `}</style>
    </div>
  );
}
