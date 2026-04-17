/**
 * Verify email page — /verify-email
 * NextAuth redirects here after user requests a magic-link.
 * Informs the user to click the link in their email.
 * Includes a "resend" option via a simple link back to /login.
 */

import type { Metadata } from "next";
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

export default function VerifyEmailPage() {
  return <VerifyEmailView />;
}
