/**
 * POST /api/contact
 *
 * Gestiona solicitudes de acceso API desde RequestAccessForm.
 * Envía dos emails vía SES: interno a support@ y auto-respuesta al solicitante.
 * Rate limit: 3 peticiones/hora por IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "@/lib/redis";
import { reportApiError } from "@/lib/api-error";
import { getClientIP } from "@/lib/api-utils";
import { sendEmail, isSESConfigured } from "@/lib/email/ses";

// ---------------------------------------------------------------------------
// Rate limiter — 3 peticiones por hora por IP
// ---------------------------------------------------------------------------

const contactLimiter: RateLimiterRedis | RateLimiterMemory = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: "ratelimit:contact",
      points: 3,
      duration: 3600,
      blockDuration: 3600,
    })
  : new RateLimiterMemory({
      keyPrefix: "ratelimit:contact",
      points: 3,
      duration: 3600,
      blockDuration: 3600,
    });

// ---------------------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface ContactPayload {
  name: string;
  email: string;
  company?: string;
  useCase: string;
  source?: string;
}

function internalEmailHtml(data: ContactPayload): string {
  const rows = [
    ["Nombre", data.name],
    ["Email", data.email],
    ["Empresa", data.company || "—"],
    ["Caso de uso", data.useCase],
    ["Origen", data.source || "api-landing"],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 12px; font-size:13px; color:#6b7280; white-space:nowrap; border-bottom:1px solid #f3f4f6;">${label}</td>
          <td style="padding:8px 12px; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">${value}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><title>Nueva solicitud de acceso</title></head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="background-color:#fff; border-radius:12px; overflow:hidden; max-width:600px; width:100%;">
        <tr>
          <td style="background-color:#0a0a0a; padding:20px 32px;">
            <span style="color:#f59e0b; font-size:20px; font-weight:800; letter-spacing:-0.5px;">trafico.live</span>
            <span style="color:#6b7280; font-size:14px; margin-left:12px;">Solicitud de acceso API</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px; font-size:20px; color:#111827; font-weight:700;">
              Nueva solicitud de acceso
            </h1>
            <p style="margin:0 0 24px; font-size:14px; color:#6b7280;">
              Recibida el ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
              ${rowsHtml}
            </table>
            <p style="margin:24px 0 0;">
              <a href="${BASE_URL}/admin/api-requests"
                style="display:inline-block; padding:10px 24px; background:#1b4bd5; color:#fff;
                font-size:14px; font-weight:600; text-decoration:none; border-radius:6px;">
                Ver en el panel
              </a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
            <p style="margin:0; font-size:11px; color:#d1d5db;">
              trafico.live — email interno generado automáticamente
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function autoReplyHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><title>Hemos recibido tu solicitud</title></head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="background-color:#fff; border-radius:12px; overflow:hidden; max-width:600px; width:100%;">
        <tr>
          <td style="background-color:#0a0a0a; padding:20px 32px;">
            <a href="${BASE_URL}" style="color:#f59e0b; font-size:24px; font-weight:800; text-decoration:none; letter-spacing:-0.5px;">trafico.live</a>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px; font-size:22px; color:#111827; font-weight:700;">
              Hemos recibido tu solicitud, ${name}
            </h1>
            <p style="margin:0 0 20px; font-size:15px; color:#374151; line-height:1.6;">
              Gracias por tu interés en la API de trafico.live. Hemos registrado tu solicitud
              y nuestro equipo la revisará en las próximas <strong>24 horas hábiles</strong>.
            </p>
            <p style="margin:0 0 20px; font-size:15px; color:#374151; line-height:1.6;">
              Mientras tanto, puedes explorar la documentación pública para familiarizarte
              con los endpoints disponibles y los formatos de respuesta.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;">
                  <a href="${BASE_URL}/api-docs"
                    style="display:inline-block; padding:12px 28px; background:#1b4bd5; color:#fff;
                    font-size:15px; font-weight:600; text-decoration:none; border-radius:8px;">
                    Ver documentación →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0; font-size:13px; color:#6b7280; line-height:1.5;">
              ¿Tienes alguna pregunta urgente? Responde a este email o visita
              <a href="${BASE_URL}/ayuda" style="color:#1b4bd5;">trafico.live/ayuda</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
            <p style="margin:0; font-size:12px; color:#9ca3af; line-height:1.5;">
              Has recibido este mensaje porque solicitaste acceso en
              <a href="${BASE_URL}" style="color:#d97706;">trafico.live</a>.
            </p>
            <p style="margin:8px 0 0; font-size:11px; color:#d1d5db;">
              trafico.live — Inteligencia vial en tiempo real · Datos: DGT, AEMET, Renfe
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Rate limit: 3 requests/hour per IP
  const ip = getClientIP(request);
  try {
    await contactLimiter.consume(ip);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return NextResponse.json(
        { ok: false },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(error.msBeforeNext / 1000)),
          },
        }
      );
    }
    // Fail open on unexpected errors — log and continue
    reportApiError(error, "contact] Rate limiter error (fail open)");
  }

  // Parse body
  let body: Partial<ContactPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { name, email, company, useCase, source } = body;

  // Validate required fields
  if (
    !name ||
    typeof name !== "string" ||
    !name.trim() ||
    !email ||
    typeof email !== "string" ||
    !useCase ||
    typeof useCase !== "string" ||
    !useCase.trim()
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Validate email format
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload: ContactPayload = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    company: company?.trim() || undefined,
    useCase: useCase.trim(),
    source: source?.trim() || "api-landing",
  };

  // Send emails (fire-and-forget on failure — never leak server errors to client)
  if (isSESConfigured()) {
    try {
      await Promise.allSettled([
        sendEmail({
          to: "support@trafico.live",
          subject: `Nueva solicitud de acceso API — ${payload.name}`,
          html: internalEmailHtml(payload),
          replyTo: payload.email,
          tags: { type: "access-request" },
        }),
        sendEmail({
          to: payload.email,
          subject: "Hemos recibido tu solicitud — trafico.live",
          html: autoReplyHtml(payload.name),
          tags: { type: "access-request-reply" },
        }),
      ]);
    } catch (error) {
      reportApiError(error, "contact] Failed to send access request emails");
    }
  } else {
    // Development fallback — log to console
    console.log("[contact] SES not configured. Would send to:", payload.email, payload);
  }

  // Always return generic success (never leak details)
  return NextResponse.json({ ok: true }, { status: 200 });
}
