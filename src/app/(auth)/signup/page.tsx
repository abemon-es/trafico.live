/**
 * Signup page — /signup
 * Password-less: first magic-link verification creates the account automatically.
 */

import type { Metadata } from "next";
import { LoginForm } from "@/app/(auth)/login/LoginForm";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Crear cuenta — trafico.live",
  description: "Crea tu cuenta en trafico.live sin contraseña. Solo necesitas tu correo electrónico.",
  alternates: {
    canonical: `${BASE_URL}/signup`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupPage() {
  return <LoginForm mode="signup" />;
}
