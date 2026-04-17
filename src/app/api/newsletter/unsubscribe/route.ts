/**
 * GET /api/newsletter/unsubscribe?token=...
 *
 * One-click unsubscribe handler. Returns a simple brand-aligned HTML page.
 * Compliant with RFC 8058 (one-click unsubscribe) and CAN-SPAM / GDPR.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";

function buildUnsubscribePage(message: string, isError = false): string {
  const color = isError ? "#dc2626" : "#059669";
  const icon = isError ? "✗" : "✓";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Baja de newsletter — trafico.live</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "DM Sans", system-ui, -apple-system, sans-serif;
      background: #f0f5ff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #c0d5ff;
      border-radius: 12px;
      padding: 3rem 2.5rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(27, 75, 213, 0.08);
    }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${isError ? "#fee2e2" : "#d1fae5"};
      color: ${color};
      font-size: 1.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .logo {
      font-family: "Exo 2", "Exo2", sans-serif;
      font-weight: 700;
      font-size: 1.125rem;
      color: #1b4bd5;
      margin-bottom: 2rem;
      letter-spacing: -0.02em;
    }
    h1 {
      font-family: "Exo 2", "Exo2", sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.75rem;
    }
    p {
      color: #4b5563;
      line-height: 1.6;
      margin-bottom: 1rem;
      font-size: 0.9375rem;
    }
    a.btn {
      display: inline-block;
      background: #1b4bd5;
      color: #ffffff;
      padding: 0.625rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      transition: background 0.15s;
    }
    a.btn:hover { background: #092ea8; }
    .footer {
      margin-top: 2rem;
      font-size: 0.8125rem;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">trafico.live</div>
    <div class="icon">${icon}</div>
    <h1>${isError ? "Enlace no válido" : "Baja procesada"}</h1>
    <p>${message}</p>
    ${
      !isError
        ? `<p>Si cambias de opinión, puedes volver a suscribirte cuando quieras.</p>
           <a href="${BASE_URL}" class="btn">Volver a trafico.live</a>`
        : `<a href="${BASE_URL}" class="btn">Ir al inicio</a>`
    }
    <div class="footer">trafico.live · Inteligencia de transporte en tiempo real</div>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || token.length < 32) {
    return new NextResponse(
      buildUnsubscribePage(
        "El enlace de baja no es válido o ha caducado. Si necesitas ayuda, contáctanos.",
        true
      ),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  let sub: { id: string; status: string } | null = null;

  try {
    sub = await prisma.newsletterSubscription.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true, status: true },
    });
  } catch (err) {
    console.error("[Newsletter/unsubscribe] DB error:", err);
    return new NextResponse(
      buildUnsubscribePage(
        "Ha ocurrido un error. Por favor, inténtalo de nuevo más tarde.",
        true
      ),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  if (!sub) {
    return new NextResponse(
      buildUnsubscribePage(
        "No hemos encontrado una suscripción con ese enlace. Es posible que ya se haya dado de baja.",
        true
      ),
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Already unsubscribed — idempotent
  if (sub.status === "UNSUBSCRIBED") {
    return new NextResponse(
      buildUnsubscribePage("Te has dado de baja. Puedes volver a suscribirte cuando quieras."),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Mark as unsubscribed
  try {
    await prisma.newsletterSubscription.update({
      where: { id: sub.id },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[Newsletter/unsubscribe] DB update error:", err);
    return new NextResponse(
      buildUnsubscribePage("Ha ocurrido un error al procesar tu baja. Inténtalo de nuevo.", true),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Optionally sync to Resend Audience
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (audienceId) {
    try {
      const { removeFromAudience } = await import("@/lib/resend");
      const subFull = await prisma.newsletterSubscription.findUnique({
        where: { id: sub.id },
        select: { email: true },
      });
      if (subFull?.email) {
        await removeFromAudience(subFull.email, audienceId);
      }
    } catch {
      // Non-critical — don't fail the unsubscribe
    }
  }

  return new NextResponse(
    buildUnsubscribePage("Te has dado de baja. Puedes volver a suscribirte cuando quieras."),
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
