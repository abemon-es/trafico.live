/**
 * Login page — /login
 * Magic-link email form + Google + GitHub OAuth.
 * Server Component shell; interactive form is a Client Component.
 */

import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Iniciar sesión — trafico.live",
  description: "Accede a tu cuenta de trafico.live con enlace mágico o mediante Google/GitHub.",
  alternates: {
    canonical: `${BASE_URL}/login`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <LoginForm mode="login" />;
}
