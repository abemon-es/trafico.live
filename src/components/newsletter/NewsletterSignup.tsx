"use client";

/**
 * NewsletterSignup — inline or card variant
 *
 * Props:
 *   source      — identifies the origin (e.g. "guia-multimodal", "home", "sidebar")
 *   leadMagnet  — optional lead magnet slug (passed to API for segmentation)
 *   variant     — "inline" (default) | "card"
 */

import { useState, useId, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { trackNewsletterSignup } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Variant = "inline" | "card";
type Status = "idle" | "submitting" | "success" | "error";

interface NewsletterSignupProps {
  source: string;
  leadMagnet?: string;
  variant?: Variant;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewsletterSignup({
  source,
  leadMagnet,
  variant = "inline",
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const inputId = useId();
  const errorId = useId();
  const statusId = useId();

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setErrorMessage("Introduce una dirección de email válida.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    // Track signup before API call (no PII in analytics)
    trackNewsletterSignup(source, leadMagnet);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source, leadMagnet }),
      });

      const data = (await res.json()) as { status?: string; error?: string };

      if (!res.ok) {
        if (res.status === 429) {
          setErrorMessage("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
        } else {
          setErrorMessage(data.error ?? "Error al suscribirte. Inténtalo de nuevo.");
        }
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage("Error de conexión. Comprueba tu red e inténtalo de nuevo.");
      setStatus("error");
    }
  }

  const isCard = variant === "card";

  return (
    <div
      className={
        isCard
          ? "rounded-xl border border-tl-200 bg-tl-50 dark:border-tl-700 dark:bg-tl-950/40 p-6"
          : ""
      }
    >
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="flex flex-col items-start gap-2"
            role="status"
            aria-live="polite"
            id={statusId}
          >
            <div className="flex items-center gap-2 text-tl-success font-semibold">
              <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>¡Revisa tu email!</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Te hemos enviado un enlace de confirmación. Confirma tu suscripción para empezar a
              recibir el resumen semanal de trafico.live.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            noValidate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            aria-describedby={status === "error" ? errorId : undefined}
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label htmlFor={inputId} className="sr-only">
                  Tu dirección de email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id={inputId}
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") {
                        setStatus("idle");
                        setErrorMessage("");
                      }
                    }}
                    disabled={status === "submitting"}
                    required
                    aria-required="true"
                    aria-invalid={status === "error" ? "true" : undefined}
                    aria-describedby={status === "error" ? errorId : undefined}
                    className="
                      w-full pl-9 pr-3 py-2.5 rounded-lg text-sm
                      border border-tl-200 dark:border-tl-700
                      bg-white dark:bg-tl-950/60
                      text-gray-900 dark:text-gray-100
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-tl-500 focus:border-transparent
                      disabled:opacity-60 disabled:cursor-not-allowed
                      transition-colors
                    "
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="
                  flex items-center justify-center gap-2
                  px-4 py-2.5 rounded-lg text-sm font-semibold
                  bg-tl-600 hover:bg-tl-700 active:bg-tl-800
                  text-white
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-colors whitespace-nowrap
                  focus:outline-none focus:ring-2 focus:ring-tl-500 focus:ring-offset-2
                "
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Enviando…</span>
                  </>
                ) : (
                  <>
                    <span>Suscribirme</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {status === "error" && errorMessage && (
                <motion.p
                  id={errorId}
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="flex items-center gap-1.5 mt-2 text-sm text-tl-danger"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Privacy note */}
            <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
              Te enviaremos email una vez por semana. Puedes cancelar cuando quieras.{" "}
              <Link
                href="/privacidad"
                className="underline underline-offset-2 hover:text-tl-600 transition-colors"
              >
                Política de privacidad
              </Link>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
