/**
 * Verify email page — /verify-email
 * NextAuth redirects here after user requests a magic-link.
 * Informs the user to click the link in their email.
 * Includes a "resend" option via a simple link back to /login.
 *
 * If ?token=XXX is present (e.g. from a custom verification email), the
 * request is forwarded to /verify-email/confirm?token=XXX which validates
 * the token against the VerificationToken table and redirects accordingly.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyEmailView } from "./VerifyEmailView";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Verifica tu correo — trafico.live",
  description: "Hemos enviado un enlace de acceso a tu correo electrónico. Haz clic en él para continuar.",
  alternates: {
    canonical: `${BASE_URL}/verify-email`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

interface Props {
  searchParams: Promise<{ token?: string; error?: string; email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams;

  // If a verification token is present, delegate to the confirm route handler.
  if (params.token) {
    redirect(`/verify-email/confirm?token=${encodeURIComponent(params.token)}`);
  }

  return <VerifyEmailView />;
}
