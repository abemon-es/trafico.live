"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { trackOutbound } from "@/lib/analytics";
// TODO: Replace trackOutbound with trackCtaClick once agent A3 adds it to src/lib/analytics.ts

type FormState = "idle" | "loading" | "success" | "error";

interface FormData {
  nombre: string;
  email: string;
  empresa: string;
  caso: string;
}

export function RequestAccessForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState<FormData>({
    nombre: "",
    email: "",
    empresa: "",
    caso: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    // Track CTA click
    trackOutbound("/api/contact", "api-landing-request-access");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          empresa: form.empresa || undefined,
          mensaje: form.caso,
          origen: "api-landing",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Error al enviar el formulario");
      }

      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Error de red. Comprueba tu conexión e inténtalo de nuevo."
      );
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center text-center py-8 gap-4">
        <div className="w-14 h-14 rounded-full bg-[color:var(--tl-primary-bg)] flex items-center justify-center">
          <CheckCircle2
            className="w-7 h-7 text-[color:var(--tl-success)]"
            aria-hidden="true"
          />
        </div>
        <div>
          <h3 className="text-lg font-heading font-bold text-foreground mb-1">
            ¡Solicitud recibida!
          </h3>
          <p className="text-sm text-tl-500 dark:text-tl-400 max-w-xs mx-auto leading-relaxed">
            Nos pondremos en contacto contigo en menos de 24 horas con tu clave
            de acceso y más información sobre el plan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setState("idle");
            setForm({ nombre: "", email: "", empresa: "", caso: "" });
          }}
          className="text-xs text-tl-500 hover:text-tl-600 underline underline-offset-2 mt-2"
        >
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Name */}
      <div>
        <label
          htmlFor="ra-nombre"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Nombre
        </label>
        <input
          id="ra-nombre"
          name="nombre"
          type="text"
          required
          value={form.nombre}
          onChange={handleChange}
          placeholder="Tu nombre"
          maxLength={120}
          className="w-full px-4 py-2.5 rounded-xl border border-tl-200 dark:border-tl-700 bg-background text-foreground placeholder-tl-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--tl-primary)] focus:border-transparent text-sm transition-shadow"
          autoComplete="name"
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="ra-email"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Email de trabajo
        </label>
        <input
          id="ra-email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="tu@empresa.com"
          className="w-full px-4 py-2.5 rounded-xl border border-tl-200 dark:border-tl-700 bg-background text-foreground placeholder-tl-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--tl-primary)] focus:border-transparent text-sm transition-shadow"
          autoComplete="email"
        />
      </div>

      {/* Company */}
      <div>
        <label
          htmlFor="ra-empresa"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Empresa{" "}
          <span className="text-tl-400 font-normal">(opcional)</span>
        </label>
        <input
          id="ra-empresa"
          name="empresa"
          type="text"
          value={form.empresa}
          onChange={handleChange}
          placeholder="Nombre de tu empresa"
          maxLength={120}
          className="w-full px-4 py-2.5 rounded-xl border border-tl-200 dark:border-tl-700 bg-background text-foreground placeholder-tl-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--tl-primary)] focus:border-transparent text-sm transition-shadow"
          autoComplete="organization"
        />
      </div>

      {/* Use case */}
      <div>
        <label
          htmlFor="ra-caso"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Caso de uso
        </label>
        <textarea
          id="ra-caso"
          name="caso"
          required
          value={form.caso}
          onChange={handleChange}
          placeholder="Describe brevemente cómo quieres usar la API: app de movilidad, análisis de datos, plataforma logística…"
          rows={4}
          maxLength={800}
          className="w-full px-4 py-2.5 rounded-xl border border-tl-200 dark:border-tl-700 bg-background text-foreground placeholder-tl-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--tl-primary)] focus:border-transparent text-sm transition-shadow resize-none"
        />
        <p className="mt-1 text-xs text-tl-400 text-right">
          {form.caso.length}/800
        </p>
      </div>

      {/* Error message */}
      {state === "error" && (
        <div
          role="alert"
          className="flex items-start gap-2.5 bg-tl-50 dark:bg-tl-950 border border-[color:var(--tl-danger)] rounded-xl px-4 py-3"
        >
          <AlertCircle
            className="w-4 h-4 text-[color:var(--tl-danger)] flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-[color:var(--tl-danger)]">{errorMsg}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={state === "loading" || !form.nombre || !form.email || !form.caso}
        className="w-full flex items-center justify-center gap-2 bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600"
      >
        {state === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Enviando…</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>Solicitar acceso</span>
          </>
        )}
      </button>

      <p className="text-xs text-tl-400 text-center">
        Sin tarjeta de crédito. Respondemos en menos de 24 horas.
      </p>
    </form>
  );
}
