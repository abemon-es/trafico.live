"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X, Hand } from "lucide-react";
import Link from "next/link";

interface ChatPanelProps {
  onClose: () => void;
}

const HEADER_ID = "chat-panel-header";

const QUICK_LINKS = [
  { label: "Ver incidencias", href: "/incidencias" },
  { label: "Gasolineras baratas", href: "/gasolineras" },
  { label: "Trenes en vivo", href: "/trenes" },
] as const;

export function ChatPanel({ onClose }: ChatPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button on open for keyboard accessibility
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // ESC key closes the panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const panelVariants = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 24 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring" as const,
            stiffness: 260,
            damping: 20,
          },
        },
        exit: {
          opacity: 0,
          y: 16,
          transition: { duration: 0.15, ease: "easeIn" },
        },
      };

  return (
    <motion.div
      role="dialog"
      aria-labelledby={HEADER_ID}
      aria-modal="false"
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl"
      style={{
        bottom: "5.5rem",
        right: "1.5rem",
        width: "min(380px, calc(100vw - 3rem))",
        maxHeight: "600px",
        backgroundColor: "var(--background)",
        border: "1px solid color-mix(in oklch, var(--color-tl-500) 20%, transparent)",
      }}
    >
      {/* ─── Header ─── */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          borderBottom: "1px solid color-mix(in oklch, currentColor 10%, transparent)",
        }}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          aria-hidden="true"
          style={{ backgroundColor: "var(--color-tl-500)" }}
        >
          <MessageCircleIcon />
        </div>

        {/* Title */}
        <h2
          id={HEADER_ID}
          className="flex-1 text-sm font-semibold"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          Asistente trafico.live
        </h2>

        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Cerrar asistente"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2"
          style={{
            // @ts-expect-error CSS custom property
            "--tw-ring-color": "var(--color-tl-500)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "color-mix(in oklch, currentColor 8%, transparent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "transparent";
          }}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* ─── Body ─── */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
        {/* Bot message bubble */}
        <div className="flex gap-3">
          {/* Bot avatar dot */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            aria-hidden="true"
            style={{ backgroundColor: "var(--color-tl-50, #f0f5ff)" }}
          >
            <Hand
              className="w-3.5 h-3.5"
              style={{ color: "var(--color-tl-600, #1b4bd5)" }}
              aria-hidden="true"
            />
          </div>

          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
            style={{
              backgroundColor: "color-mix(in oklch, var(--color-tl-500) 8%, transparent)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Pronto podré ayudarte a consultar incidencias, precios de
            combustible, trenes y vuelos en tiempo real. Mientras tanto,
            explora los mapas en vivo o contacta con nosotros.
          </div>
        </div>

        {/* Quick links row */}
        <div className="flex flex-wrap gap-2 pl-10" role="list" aria-label="Accesos rápidos">
          {QUICK_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              role="listitem"
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                backgroundColor: "color-mix(in oklch, var(--color-tl-500) 10%, transparent)",
                color: "var(--color-tl-600, #1b4bd5)",
                border: "1px solid color-mix(in oklch, var(--color-tl-500) 20%, transparent)",
                // @ts-expect-error CSS custom property
                "--tw-ring-color": "var(--color-tl-500)",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div
        className="px-4 py-3 shrink-0 space-y-2"
        style={{
          borderTop: "1px solid color-mix(in oklch, currentColor 10%, transparent)",
        }}
      >
        {/* Disabled textarea */}
        <div className="relative">
          <textarea
            disabled
            placeholder="El chat estará disponible en S3"
            rows={2}
            className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none cursor-not-allowed"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              backgroundColor: "color-mix(in oklch, currentColor 5%, transparent)",
              border: "1px solid color-mix(in oklch, currentColor 12%, transparent)",
              color: "color-mix(in oklch, currentColor 40%, transparent)",
            }}
            aria-label="Campo de chat deshabilitado"
          />
        </div>

        {/* "Próximamente" badge */}
        <div className="flex justify-end">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              backgroundColor: "color-mix(in oklch, var(--color-tl-amber-500) 15%, transparent)",
              color: "var(--color-tl-amber-500)",
              border: "1px solid color-mix(in oklch, var(--color-tl-amber-500) 30%, transparent)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "var(--color-tl-amber-500)" }}
              aria-hidden="true"
            />
            Próximamente
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/** Inline mini icon for the header avatar to avoid importing MessageCircle twice */
function MessageCircleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="white"
      stroke="white"
      strokeWidth="0"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
