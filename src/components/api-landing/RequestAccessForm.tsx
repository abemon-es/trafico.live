"use client";

/**
 * RequestAccessForm — Formulario de solicitud de acceso a la API.
 * POSTea a /api/contact con validación client-side y manejo de estados.
 * Incluye checkbox opcional de newsletter (llama a /api/digest/subscribe).
 */

import { useState, useId } from "react";
import { Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { trackFilter } from "@/lib/analytics";

// ------------------------------------------------------------------ types ---

interface FormState {
  name: string;
  email: string;
  company: string;
  useCase: string;
  newsletter: boolean;
}

type Status = "idle" | "submitting" | "success" | "error";

// ----------------------------------------------------------------- helpers ---

function trackCtaClick(action: string, component: string, page: string) {
  trackFilter("cta_click", `${action}::${component}::${page}`);
}

function trackNewsletterSignup(email: string) {
  trackFilter("newsletter_signup", email);
}

// ---------------------------------------------------------------- component ---

export default function RequestAccessForm() {
  const formId = useId();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    company: "",
    useCase: "",
    newsletter: false,
  });
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // ----------------------------------------------------------------- validate

  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errors.name = "El nombre es obligatorio";
    if (!form.email.trim()) {
      errors.email = "El email es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Introduce un email válido";
    }
    if (!form.useCase.trim()) errors.useCase = "Cuéntanos brevemente tu caso de uso";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ----------------------------------------------------------------- submit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    trackCtaClick("request-access", "RequestAccessForm", "api-landing");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          company: form.company.trim() || undefined,
          useCase: form.useCase.trim(),
          source: "api-landing",
        }),
      });

      if (res.status === 429) {
        setStatus("error");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        return;
      }

      // Newsletter opt-in (parallel, non-blocking)
      if (form.newsletter) {
        trackNewsletterSignup(form.email.trim().toLowerCase());
        fetch("/api/digest/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email.trim().toLowerCase() }),
        }).catch(() => {
          // Non-critical — ignore errors silently
        });
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  // ----------------------------------------------------------------- success state

  if (status === "success") {
    return (
      <div
        id="request-access"
        className="rounded-2xl border border-tl-100 bg-tl-50 p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tl-success)]/10">
          <CheckCircle2 className="h-7 w-7 text-[var(--tl-success)]" />
        </div>
        <h3
          className="mb-2 font-['Exo_2'] text-xl font-bold text-gray-900"
          style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
        >
          ¡Solicitud recibida!
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Hemos recibido tu solicitud y nuestro equipo te responderá en{" "}
          <strong>24 horas hábiles</strong>. Mientras tanto, puedes explorar la{" "}
          <a href="/api-docs" className="text-tl-600 underline-offset-2 hover:underline">
            documentación pública
          </a>
          .
        </p>
      </div>
    );
  }

  // ----------------------------------------------------------------- form

  return (
    <form
      id="request-access"
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
      aria-label="Formulario de solicitud de acceso a la API"
    >
      {/* Error banner */}
      {status === "error" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-[var(--tl-danger)]/30 bg-[var(--tl-danger)]/5 p-4 text-sm text-[var(--tl-danger)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Ha ocurrido un error al enviar tu solicitud. Por favor, inténtalo de nuevo en unos
            minutos.
          </span>
        </div>
      )}

      {/* Nombre */}
      <div>
        <label
          htmlFor={`${formId}-name`}
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Nombre completo <span aria-hidden="true" className="text-[var(--tl-danger)]">*</span>
        </label>
        <input
          id={`${formId}-name`}
          type="text"
          autoComplete="name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="María García"
          aria-describedby={fieldErrors.name ? `${formId}-name-error` : undefined}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-tl-500 focus:ring-2 focus:ring-tl-200 ${
            fieldErrors.name ? "border-[var(--tl-danger)]" : "border-gray-200"
          }`}
        />
        {fieldErrors.name && (
          <p id={`${formId}-name-error`} className="mt-1 text-xs text-[var(--tl-danger)]">
            {fieldErrors.name}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor={`${formId}-email`}
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Email profesional <span aria-hidden="true" className="text-[var(--tl-danger)]">*</span>
        </label>
        <input
          id={`${formId}-email`}
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="maria@empresa.com"
          aria-describedby={fieldErrors.email ? `${formId}-email-error` : undefined}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-tl-500 focus:ring-2 focus:ring-tl-200 ${
            fieldErrors.email ? "border-[var(--tl-danger)]" : "border-gray-200"
          }`}
        />
        {fieldErrors.email && (
          <p id={`${formId}-email-error`} className="mt-1 text-xs text-[var(--tl-danger)]">
            {fieldErrors.email}
          </p>
        )}
      </div>

      {/* Empresa */}
      <div>
        <label
          htmlFor={`${formId}-company`}
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Empresa <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          id={`${formId}-company`}
          type="text"
          autoComplete="organization"
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          placeholder="Acme Logistics, S.L."
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-tl-500 focus:ring-2 focus:ring-tl-200"
        />
      </div>

      {/* Caso de uso */}
      <div>
        <label
          htmlFor={`${formId}-usecase`}
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          ¿Para qué necesitas la API?{" "}
          <span aria-hidden="true" className="text-[var(--tl-danger)]">*</span>
        </label>
        <textarea
          id={`${formId}-usecase`}
          required
          rows={3}
          value={form.useCase}
          onChange={(e) => setForm((f) => ({ ...f, useCase: e.target.value }))}
          placeholder="Ej: Integrar datos de tráfico en tiempo real en nuestra app de gestión de flotas para optimizar rutas…"
          aria-describedby={fieldErrors.useCase ? `${formId}-usecase-error` : undefined}
          className={`w-full resize-none rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-tl-500 focus:ring-2 focus:ring-tl-200 ${
            fieldErrors.useCase ? "border-[var(--tl-danger)]" : "border-gray-200"
          }`}
        />
        {fieldErrors.useCase && (
          <p id={`${formId}-usecase-error`} className="mt-1 text-xs text-[var(--tl-danger)]">
            {fieldErrors.useCase}
          </p>
        )}
      </div>

      {/* Newsletter opt-in */}
      <div className="flex items-start gap-3">
        <input
          id={`${formId}-newsletter`}
          type="checkbox"
          checked={form.newsletter}
          onChange={(e) => setForm((f) => ({ ...f, newsletter: e.target.checked }))}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-tl-600 focus:ring-tl-500"
        />
        <label htmlFor={`${formId}-newsletter`} className="text-sm text-gray-600 leading-snug">
          Suscribirme al newsletter semanal con novedades de la API, nuevos endpoints y datos
          destacados de movilidad en España
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-tl-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-tl-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Enviando…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Solicitar acceso
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Al enviar, aceptas nuestra{" "}
        <a href="/privacidad" className="underline-offset-2 hover:underline">
          política de privacidad
        </a>
        . Sin spam. Cancelación inmediata.
      </p>
    </form>
  );
}
