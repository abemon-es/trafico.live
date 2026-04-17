/**
 * Centered auth shell layout.
 * Used by /login, /signup, /forgot-password, /verify-email.
 * Brand logo at top, card centered, Motion fade-in (respects reduced-motion).
 */

"use client";

import { motion } from "motion/react";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--tl-primary-bg)" }}
    >
      {/* Brand logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={
          {
            // Respect reduced-motion: the CSS below overrides the transform
            // when the user has prefers-reduced-motion: reduce
          } as React.CSSProperties
        }
        className="mb-8 motion-reduce:translate-y-0 motion-reduce:opacity-100"
      >
        <Link
          href="/"
          className="flex items-center gap-2 group focus:outline-none"
          aria-label="trafico.live — inicio"
        >
          {/* Wordmark */}
          <span
            className="text-2xl font-extrabold tracking-tight select-none"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--tl-primary)",
            }}
          >
            trafico
            <span style={{ color: "var(--tl-accent)" }}>.</span>
            <span style={{ color: "var(--tl-primary)" }}>live</span>
          </span>
        </Link>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
        className="w-full max-w-md motion-reduce:translate-y-0 motion-reduce:opacity-100"
      >
        <div
          className="rounded-2xl shadow-lg p-8 border"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--tl-primary-bg-hover)",
          }}
        >
          {children}
        </div>
      </motion.div>

      {/* Footer note */}
      <p
        className="mt-6 text-xs text-center"
        style={{ color: "color-mix(in oklch, var(--foreground) 50%, transparent)" }}
      >
        Al continuar aceptas los{" "}
        <Link
          href="/terminos"
          className="underline hover:no-underline"
          style={{ color: "var(--tl-primary)" }}
        >
          términos de uso
        </Link>{" "}
        y la{" "}
        <Link
          href="/privacidad"
          className="underline hover:no-underline"
          style={{ color: "var(--tl-primary)" }}
        >
          política de privacidad
        </Link>
        .
      </p>
    </div>
  );
}
