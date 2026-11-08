/**
 * POST /api/contacto/general
 *
 * Formulario público general de contacto en /sobre/contacto. Envía a
 * hola@trafico.live (Cloudflare Email Routing reenvía al operador).
 *
 * - Validación servidor-side de campos + email
 * - Verificación opcional Cloudflare Turnstile (si TURNSTILE_SECRET_KEY presente)
 * - Rate limit: 5 peticiones/hora por IP (Redis o memoria)
 * - Honeypot y casilla de privacidad obligatoria
 * - Envío via SES (helper compartido); copia a BMC One después de responder
 * - Sin SES: la copia a BMC One es la entrega (src/lib/contact-delivery.ts)
 * - Reply-To = email del remitente (operador puede responder con un click)
 */

import { NextRequest, NextResponse } from "next/server";
import { RateLimiterRes } from "rate-limiter-flexible";
import { createLimiter } from "@/lib/limiter";
import { reportApiError } from "@/lib/api-error";
import { getClientIP } from "@/lib/api-utils";
import { isSESConfigured, sendEmail } from "@/lib/email/ses";
import { INLINE_RETRY, forwardToBmc, isBmcForwardConfigured, type ForwardInput } from "@/lib/bmc-forms-forward";
import { forwardToBmcAfterResponse } from "@/lib/bmc-forms-forward-after";
import { deliverContact } from "@/lib/contact-delivery";
import { checkTurnstile, honeypotTripped } from "@/lib/form-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPIC_LABELS: Record<string, string> = {
  general: "Consulta general",
  api: "Soporte API",
  partnerships: "Colaboración / Partnership",
  prensa: "Prensa",
  legal: "Legal",
  dpo: "Protección de datos (DPO)",
  datos: "Acceso a datos / Dataset",
  bug: "Reportar un bug",
};

interface ContactPayload {
  nombre: string;
  email: string;
  empresa?: string;
  topic: string;
  mensaje: string;
  turnstileToken?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Rate limiter — 5 peticiones por hora por IP (más permisivo que /api/contact
// porque es el contacto general, no una solicitud de acceso)
// ---------------------------------------------------------------------------

const limiter = createLimiter({
  keyPrefix: "ratelimit:contacto-general",
  points: 5,
  duration: 3600,
  blockDuration: 3600,
});

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body: unknown):
  | { ok: true; data: ContactPayload }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Solicitud no válida" };
  const b = body as Record<string, unknown>;
  const nombre = typeof b.nombre === "string" ? b.nombre.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const empresa = typeof b.empresa === "string" ? b.empresa.trim() : "";
  const topic = typeof b.topic === "string" ? b.topic : "";
  const mensaje = typeof b.mensaje === "string" ? b.mensaje.trim() : "";
  const turnstileToken = typeof b.turnstileToken === "string" ? b.turnstileToken : "";

  if (nombre.length < 2 || nombre.length > 80) {
    return { ok: false, error: "El nombre debe tener entre 2 y 80 caracteres" };
  }
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return { ok: false, error: "Email no válido" };
  }
  if (empresa.length > 120) {
    return { ok: false, error: "Empresa demasiado larga (máximo 120 caracteres)" };
  }
  if (!TOPIC_LABELS[topic]) {
    return { ok: false, error: "Tema no válido" };
  }
  if (mensaje.length < 20 || mensaje.length > 5000) {
    return { ok: false, error: "El mensaje debe tener entre 20 y 5000 caracteres" };
  }
  if (b.consentPrivacy !== true) {
    return { ok: false, error: "Debes aceptar la política de privacidad" };
  }

  return { ok: true, data: { nombre, email, empresa, topic, mensaje, turnstileToken } };
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function internalEmailHtml(data: ContactPayload, meta: { ip: string; userAgent: string | null }): string {
  const topicLabel = TOPIC_LABELS[data.topic] ?? data.topic;
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><title>${escapeHtml(topicLabel)}</title></head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="background-color:#fff; border-radius:12px; overflow:hidden; max-width:600px; width:100%;">
        <tr>
          <td style="background-color:#0a0a0a; padding:20px 32px;">
            <span style="color:#f59e0b; font-size:20px; font-weight:800; letter-spacing:-0.5px;">trafico.live</span>
            <span style="color:#6b7280; font-size:14px; margin-left:12px;">${escapeHtml(topicLabel)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px; font-size:20px; color:#111827; font-weight:700;">
              Nuevo mensaje · ${escapeHtml(data.nombre)}
            </h1>
            <p style="margin:0 0 20px; font-size:13px; color:#6b7280;">
              Formulario público · ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:20px;">
              <tr>
                <td style="padding:8px 12px; font-size:13px; color:#6b7280; width:100px; border-bottom:1px solid #f3f4f6;">Email</td>
                <td style="padding:8px 12px; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">
                  <a href="mailto:${escapeHtml(data.email)}" style="color:#1b4bd5;">${escapeHtml(data.email)}</a>
                </td>
              </tr>
              ${data.empresa ? `<tr>
                <td style="padding:8px 12px; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6;">Empresa</td>
                <td style="padding:8px 12px; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">${escapeHtml(data.empresa)}</td>
              </tr>` : ""}
              <tr>
                <td style="padding:8px 12px; font-size:13px; color:#6b7280;">Tema</td>
                <td style="padding:8px 12px; font-size:14px; color:#111827;">${escapeHtml(topicLabel)}</td>
              </tr>
            </table>

            <div style="margin:0 0 20px; padding:16px; background:#f9fafb; border-radius:8px;
              white-space:pre-wrap; font-size:14px; line-height:1.6; color:#111827;">${escapeHtml(data.mensaje)}</div>

            <p style="margin:0; font-size:11px; color:#9ca3af;">
              IP: ${escapeHtml(meta.ip)} · UA: ${escapeHtml((meta.userAgent ?? "").slice(0, 100))}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIP(request);

  // Rate limit
  try {
    await limiter.consume(ip);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return NextResponse.json(
        { ok: false, error: "Has enviado demasiados mensajes. Inténtalo más tarde." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(error.msBeforeNext / 1000)) } }
      );
    }
    reportApiError(error, "contacto-general] Rate limiter error (fail open)");
  }

  // Parse + validate
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  // Honeypot: answered like a success, nothing stored or sent.
  if (honeypotTripped(json)) {
    return NextResponse.json({ ok: true });
  }

  const v = validate(json);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  }

  // Turnstile
  const turnstile = await checkTurnstile(v.data.turnstileToken ?? "", ip, {
    onError: (error) => reportApiError(error, "contacto-general] Turnstile"),
  });
  if (turnstile === "misconfigured") {
    return NextResponse.json(
      { ok: false, error: "El formulario no está disponible. Escríbenos a hola@trafico.live" },
      { status: 503 }
    );
  }
  if (turnstile === "failed") {
    return NextResponse.json(
      { ok: false, error: "Verificación anti-bot fallida. Recarga la página e inténtalo de nuevo." },
      { status: 403 }
    );
  }

  // Send
  const topicLabel = TOPIC_LABELS[v.data.topic];
  const userAgent = request.headers.get("user-agent");

  const forwardInput: ForwardInput = {
    name: v.data.nombre,
    email: v.data.email,
    company: v.data.empresa || undefined,
    subject: `Contacto trafico.live: ${topicLabel}`,
    message: v.data.mensaje,
    consentPrivacy: true,
    language: "es",
    page: `${BASE_URL}/sobre/contacto`,
    entryPoint: "contacto",
  };

  const result = await deliverContact({
    sesConfigured: isSESConfigured(),
    forwardConfigured: isBmcForwardConfigured(),
    sendEmails: async () => {
      await sendEmail({
        to: "hola@trafico.live",
        subject: `[trafico.live · ${topicLabel}] ${v.data.nombre}`,
        html: internalEmailHtml(v.data, { ip, userAgent }),
        replyTo: v.data.email,
        tags: { type: "contacto-general", topic: v.data.topic },
      });
    },
    forwardNow: () => forwardToBmc(forwardInput, {}, INLINE_RETRY),
    forwardLater: () => forwardToBmcAfterResponse(forwardInput),
  });

  switch (result.kind) {
    case "emailed":
    case "forwarded":
      return NextResponse.json({ ok: true });
    case "email-failed":
      reportApiError(result.error, "contacto-general] Failed to send");
      return NextResponse.json(
        { ok: false, error: "Error al enviar. Inténtalo más tarde o escribe directamente a hola@trafico.live" },
        { status: 500 }
      );
    case "forward-failed":
      // Nothing from the request is logged; only the outcome code.
      reportApiError(new Error("Contact form: copy to BMC One failed"), "contacto-general", {
        form: "contacto-general",
        topic: v.data.topic,
        code: result.code,
      });
      return NextResponse.json(
        { ok: false, error: "No hemos podido registrar tu mensaje. Inténtalo más tarde o escríbenos a hola@trafico.live" },
        { status: 503 }
      );
    case "no-channel":
      // No sender and no forwarding: refuse, and say where to write. Nothing
      // from the request is logged; the event carries no personal data.
      reportApiError(
        new Error("Contact form refused: no email sender or forwarding configured"),
        "contacto-general",
        { form: "contacto-general", topic: v.data.topic }
      );
      return NextResponse.json(
        { ok: false, error: "El formulario no está disponible. Escríbenos a hola@trafico.live" },
        { status: 503 }
      );
  }
}
