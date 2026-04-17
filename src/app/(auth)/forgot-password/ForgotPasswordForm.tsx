/**
 * ForgotPasswordForm — client component.
 * We don't have passwords, so this form sends a magic-link to re-gain access.
 */

"use client";

import { useState, useTransition } from "react";
import { Mail, ArrowRight, KeyRound } from "lucide-react";
import { signInMagicLink } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await signInMagicLink(email, "/account");
        setSent(true);
      } catch {
        setError("Ha ocurrido un error. Inténtalo de nuevo.");
      }
    });
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: "var(--tl-primary-bg)" }}
        >
          <Mail
            className="w-7 h-7"
            style={{ color: "var(--tl-primary)" }}
            aria-hidden="true"
          />
        </div>
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--foreground)" }}
        >
          Enlace enviado
        </h1>
        <p
          className="text-sm"
          style={{ color: "color-mix(in oklch, var(--foreground) 65%, transparent)" }}
        >
          Hemos enviado un enlace de acceso a{" "}
          <span className="font-semibold" style={{ color: "var(--foreground)" }}>
            {email}
          </span>
          . Haz clic en él para recuperar el acceso a tu cuenta.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-sm underline hover:no-underline"
          style={{ color: "var(--tl-primary)" }}
        >
          Volver a intentarlo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Icon + heading */}
      <div className="space-y-1">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: "var(--tl-primary-bg)" }}
        >
          <KeyRound
            className="w-6 h-6"
            style={{ color: "var(--tl-primary)" }}
            aria-hidden="true"
          />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--foreground)" }}
        >
          Recuperar acceso
        </h1>
        <p
          className="text-sm"
          style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}
        >
          trafico.live no usa contraseñas. Te enviaremos un enlace para
          restablecer el acceso directamente a tu correo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--foreground)" }}
          >
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.es"
            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors"
            style={{
              borderColor: "var(--tl-primary-bg-hover)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--tl-danger)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !email}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "var(--tl-primary)",
            color: "#ffffff",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--tl-primary-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--tl-primary)";
          }}
        >
          {isPending ? "Enviando…" : "Enviar enlace de acceso"}
          {!isPending && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
        </button>
      </form>

      <p
        className="text-sm text-center"
        style={{ color: "color-mix(in oklch, var(--foreground) 55%, transparent)" }}
      >
        ¿Recuerdas tu acceso?{" "}
        <a
          href="/login"
          className="font-medium underline hover:no-underline"
          style={{ color: "var(--tl-primary)" }}
        >
          Volver al inicio de sesión
        </a>
      </p>
    </div>
  );
}
