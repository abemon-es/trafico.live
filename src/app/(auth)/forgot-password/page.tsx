/**
 * Forgot password page — /forgot-password
 * Since we use magic-link auth (no passwords), this page explains that and
 * lets users request a new magic-link to regain access.
 */

import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Recuperar acceso — trafico.live",
  description: "Recupera el acceso a tu cuenta de trafico.live. Te enviaremos un enlace de acceso a tu correo electrónico.",
  alternates: {
    canonical: `${BASE_URL}/forgot-password`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
