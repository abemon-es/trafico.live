import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Metadata — hoisted here because /ayuda/page.tsx is a Client Component
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Centro de ayuda — trafico.live",
  description:
    "Guías, respuestas frecuentes y documentación técnica sobre la API, tiers de precio, autenticación, webhooks e integración con IA (MCP) en trafico.live.",
  alternates: {
    canonical: `${BASE_URL}/ayuda`,
  },
  openGraph: {
    title: "Centro de ayuda — trafico.live",
    description:
      "Todo lo que necesitas para integrar la API de tráfico, meteorología, trenes y más en tu aplicación.",
    url: `${BASE_URL}/ayuda`,
    siteName: "trafico.live",
    type: "website",
  },
};

export const revalidate = 3600;

interface AyudaLayoutProps {
  children: ReactNode;
}

export default function AyudaLayout({ children }: AyudaLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb bar */}
      <nav
        aria-label="Migas de pan"
        className="border-b border-gray-100 bg-white"
      >
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
          <ol className="flex items-center gap-1.5 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-tl-700 transition-colors">
                trafico.live
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              <Link
                href="/ayuda"
                className="flex items-center gap-1 hover:text-tl-700 transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Centro de ayuda
              </Link>
            </li>
          </ol>
        </div>
      </nav>

      {/* Page content */}
      <main>{children}</main>

      {/* Footer CTA */}
      <aside className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 text-center">
          <p
            className="mb-1 text-base font-semibold text-gray-900"
            style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
          >
            ¿No encuentras lo que buscas?
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Nuestro equipo está disponible en horario de oficina (España).
          </p>
          <Link
            href="/api-landing#request-access"
            className="inline-flex items-center gap-2 rounded-xl bg-tl-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-tl-700"
          >
            Contactar con soporte
          </Link>
        </div>
      </aside>
    </div>
  );
}
