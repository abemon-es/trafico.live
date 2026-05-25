"use client";

import { useState } from "react";
import { Mail, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.message || "Error al suscribirse. Inténtalo de nuevo.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Error de red. Comprueba tu conexión e inténtalo de nuevo.");
      setStatus("error");
    }
  }

  return (
    <section
      className="w-full py-10 px-4 sm:px-6 lg:px-8"
      style={{
        background: "linear-gradient(to right, var(--color-tl-700), var(--color-tl-600))",
      }}
      aria-label="Suscripción al resumen semanal de tráfico"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Copy */}
          <div className="flex items-start gap-3">
            <Mail className="w-6 h-6 text-white/80 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-white font-heading font-semibold text-lg leading-tight">
                El estado del tráfico, cada lunes en tu bandeja
              </p>
              <p className="text-white/70 text-sm mt-0.5">
                Resumen semanal · datos exclusivos · sin spam
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="w-full md:w-auto md:min-w-[420px]">
            {status === "success" ? (
              <div className="flex items-center gap-2 text-white bg-white/10 rounded-lg px-4 py-3">
                <CheckCircle className="w-5 h-5 text-emerald-300 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">
                  ¡Suscrito! Recibirás el próximo resumen el lunes.
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="newsletter-email" className="sr-only">
                  Tu dirección de correo electrónico
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-white/15 border border-white/35 text-white placeholder:text-white/75 focus:outline-none focus:ring-2 focus:ring-white/70 focus:border-white/60 transition-colors"
                  disabled={status === "loading"}
                  autoComplete="email"
                />
                <button
                  type="submit"
                  disabled={status === "loading" || !email}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-tl-700 hover:bg-tl-50 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-heading shrink-0"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Enviando…
                    </>
                  ) : (
                    "Suscribir"
                  )}
                </button>
              </form>
            )}

            {status === "error" && errorMsg && (
              <p className="flex items-center gap-1.5 text-red-300 text-xs mt-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
