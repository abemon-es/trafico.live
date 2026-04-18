/**
 * VerifyEmailView — client component.
 * Static "check your inbox" screen with resend option.
 */

"use client";

import { MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  // NextAuth passes the email as ?email=... on the verifyRequest redirect
  const email = searchParams.get("email");

  return (
    <div className="text-center space-y-5">
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
        style={{ backgroundColor: "var(--tl-primary-bg)" }}
      >
        <MailCheck
          className="w-8 h-8"
          style={{ color: "var(--tl-primary)" }}
          aria-hidden="true"
        />
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--foreground)" }}
        >
          Revisa tu correo
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "color-mix(in oklch, var(--foreground) 65%, transparent)" }}
        >
          {email ? (
            <>
              Hemos enviado un enlace de acceso a{" "}
              <strong style={{ color: "var(--foreground)" }}>{email}</strong>.
            </>
          ) : (
            <>Hemos enviado un enlace de acceso a tu correo electrónico.</>
          )}{" "}
          Haz clic en él para completar el inicio de sesión. El enlace caduca
          en 24 horas.
        </p>
      </div>

      {/* Tips */}
      <div
        className="rounded-xl p-4 text-left space-y-1.5"
        style={{ backgroundColor: "var(--tl-primary-bg)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--tl-primary)" }}
        >
          ¿No ves el correo?
        </p>
        <ul
          className="text-sm space-y-1 list-disc list-inside"
          style={{ color: "color-mix(in oklch, var(--foreground) 65%, transparent)" }}
        >
          <li>Revisa la carpeta de spam o correo no deseado.</li>
          <li>Comprueba que el correo es correcto.</li>
          <li>El remitente es: noreply@trafico.live</li>
        </ul>
      </div>

      {/* Resend option */}
      <p
        className="text-sm"
        style={{ color: "color-mix(in oklch, var(--foreground) 55%, transparent)" }}
      >
        ¿No has recibido nada?{" "}
        <a
          href="/login"
          className="font-medium underline hover:no-underline"
          style={{ color: "var(--tl-primary)" }}
        >
          Solicitar nuevo enlace
        </a>
      </p>
    </div>
  );
}

export function VerifyEmailView() {
  return (
    <Suspense
      fallback={
        <div
          className="text-center text-sm"
          style={{ color: "color-mix(in oklch, var(--foreground) 50%, transparent)" }}
        >
          Cargando…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
