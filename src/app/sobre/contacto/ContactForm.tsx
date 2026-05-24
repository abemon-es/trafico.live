"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

const TOPICS = [
  { value: "general", label: "Consulta general" },
  { value: "api", label: "Soporte API" },
  { value: "partnerships", label: "Colaboración / Partnership" },
  { value: "prensa", label: "Prensa" },
  { value: "legal", label: "Legal" },
  { value: "dpo", label: "Protección de datos (DPO)" },
  { value: "datos", label: "Acceso a datos / Dataset" },
  { value: "bug", label: "Reportar un bug" },
] as const;

type Status = "idle" | "submitting" | "success" | "error";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  language?: string;
}

interface ContactFormProps {
  turnstileSiteKey: string | null;
}

export default function ContactForm({ turnstileSiteKey }: ContactFormProps) {
  const [topic, setTopic] = useState<string>("general");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Load Turnstile script + render widget when site key is provided
  useEffect(() => {
    if (!turnstileSiteKey) return;

    const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit";

    const renderWidget = () => {
      if (!turnstileContainerRef.current || !window.turnstile) return;
      try {
        widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => setTurnstileToken(token),
          "error-callback": () => setTurnstileToken(""),
          "expired-callback": () => setTurnstileToken(""),
          theme: "auto",
          language: "es",
        });
      } catch (e) {
        console.error("[turnstile] render failed", e);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      window.onloadTurnstileCallback = renderWidget;
      const script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [turnstileSiteKey]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contacto/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(),
          empresa: empresa.trim(),
          topic,
          mensaje: mensaje.trim(),
          turnstileToken,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo enviar el mensaje");
      }
      setStatus("success");
      // Reset form for next submission
      setNombre("");
      setEmail("");
      setEmpresa("");
      setMensaje("");
      setTopic("general");
      setTurnstileToken("");
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
        <h3 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-50 mb-2">
          Mensaje enviado
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Gracias por escribirnos. Te responderemos a la mayor brevedad posible.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-sm font-semibold text-tl-600 hover:text-tl-700 dark:text-tl-400"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  const turnstileReady = !turnstileSiteKey || Boolean(turnstileToken);
  const formReady =
    nombre.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    mensaje.trim().length >= 20 &&
    turnstileReady;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Topic */}
      <div>
        <label htmlFor="topic" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Tema <span className="text-rose-500">*</span>
        </label>
        <select
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-500"
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Nombre + Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="nombre" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Nombre <span className="text-rose-500">*</span>
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={120}
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-500"
          />
        </div>
      </div>

      {/* Empresa */}
      <div>
        <label htmlFor="empresa" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Empresa / Organización <span className="text-gray-400 text-xs font-normal">(opcional)</span>
        </label>
        <input
          id="empresa"
          type="text"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          maxLength={120}
          autoComplete="organization"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-500"
        />
      </div>

      {/* Mensaje */}
      <div>
        <label htmlFor="mensaje" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Mensaje <span className="text-rose-500">*</span>
          <span className="ml-2 text-xs font-normal text-gray-500">
            {mensaje.length} / 5000
          </span>
        </label>
        <textarea
          id="mensaje"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          required
          minLength={20}
          maxLength={5000}
          rows={6}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-500 resize-y"
          placeholder="Cuéntanos en qué podemos ayudarte. Mínimo 20 caracteres."
        />
      </div>

      {/* Turnstile */}
      {turnstileSiteKey ? (
        <div>
          <div ref={turnstileContainerRef} className="cf-turnstile" />
        </div>
      ) : null}

      {/* Error message */}
      {status === "error" ? (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30 p-4">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-rose-800 dark:text-rose-300">{errorMsg}</p>
        </div>
      ) : null}

      {/* Submit */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Al enviar aceptas nuestra{" "}
          <a href="/privacidad" className="text-tl-600 hover:underline dark:text-tl-400">
            política de privacidad
          </a>
          .
        </p>
        <button
          type="submit"
          disabled={!formReady || status === "submitting"}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-tl-600 hover:bg-tl-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 transition-colors"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Enviar mensaje
            </>
          )}
        </button>
      </div>
    </form>
  );
}
