/**
 * LoginForm — client component shared by /login and /signup.
 * Handles magic-link email submission and OAuth sign-in.
 */

"use client";

import { useState, useTransition } from "react";
import { Mail, ArrowRight, Github } from "lucide-react";
import { signInMagicLink, signInProvider } from "@/lib/auth-client";

interface LoginFormProps {
  /** "login" shows "Iniciar sesión" copy; "signup" shows "Crear cuenta" copy */
  mode: "login" | "signup";
  callbackUrl?: string;
}

export function LoginForm({ mode, callbackUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSignup = mode === "signup";
  const heading = isSignup ? "Crear cuenta" : "Iniciar sesión";
  const subheading = isSignup
    ? "Registra tu cuenta con un enlace mágico sin contraseña."
    : "Accede con un enlace mágico enviado a tu correo.";
  const cta = isSignup ? "Enviarme el enlace" : "Enviar enlace de acceso";
  const switchText = isSignup
    ? "¿Ya tienes cuenta?"
    : "¿Aún no tienes cuenta?";
  const switchLinkText = isSignup ? "Inicia sesión" : "Regístrate";
  const switchHref = isSignup ? "/login" : "/signup";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await signInMagicLink(email, callbackUrl);
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
          Revisa tu correo
        </h1>
        <p className="text-sm" style={{ color: "color-mix(in oklch, var(--foreground) 65%, transparent)" }}>
          Hemos enviado un enlace de acceso a{" "}
          <span className="font-semibold" style={{ color: "var(--foreground)" }}>
            {email}
          </span>
          . Haz clic en él para continuar.
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
      {/* Heading */}
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--foreground)" }}
        >
          {heading}
        </h1>
        <p
          className="text-sm"
          style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}
        >
          {subheading}
        </p>
      </div>

      {/* Magic-link form */}
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
            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2"
            style={{
              borderColor: "var(--tl-primary-bg-hover)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              // focus ring via inline style for brand colour
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
          {isPending ? "Enviando…" : cta}
          {!isPending && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div
          className="flex-1 h-px"
          style={{ backgroundColor: "var(--tl-primary-bg-hover)" }}
        />
        <span
          className="text-xs shrink-0"
          style={{ color: "color-mix(in oklch, var(--foreground) 45%, transparent)" }}
        >
          o continuar con
        </span>
        <div
          className="flex-1 h-px"
          style={{ backgroundColor: "var(--tl-primary-bg-hover)" }}
        />
      </div>

      {/* OAuth buttons */}
      <div className="space-y-2.5">
        {/* Google */}
        <button
          type="button"
          onClick={() => signInProvider("google", callbackUrl)}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            borderColor: "var(--tl-primary-bg-hover)",
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--tl-primary-bg)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--background)";
          }}
        >
          {/* Google "G" icon (inline SVG — no external asset dependency) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-4 h-4 shrink-0"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </button>

        {/* GitHub */}
        <button
          type="button"
          onClick={() => signInProvider("github", callbackUrl)}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            borderColor: "var(--tl-primary-bg-hover)",
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--tl-primary-bg)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--background)";
          }}
        >
          <Github className="w-4 h-4 shrink-0" aria-hidden="true" />
          Continuar con GitHub
        </button>
      </div>

      {/* Switch between login / signup */}
      <p
        className="text-sm text-center"
        style={{ color: "color-mix(in oklch, var(--foreground) 55%, transparent)" }}
      >
        {switchText}{" "}
        <a
          href={switchHref}
          className="font-medium underline hover:no-underline"
          style={{ color: "var(--tl-primary)" }}
        >
          {switchLinkText}
        </a>
      </p>
    </div>
  );
}
