import { ReactNode } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

interface BreadcrumbItem {
  name: string;
  href: string;
}

interface LegalPageShellProps {
  /** Page title rendered as H1 */
  title: string;
  /** ISO date string — displayed as "DD de MMMM de YYYY" */
  lastUpdated: string;
  /** Breadcrumb trail including the current page as last item */
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}

/**
 * Shared layout shell for all legal pages.
 * Includes breadcrumb nav, H1, last-updated subtitle, content area,
 * and a Certus SPV / DPO footer.
 */
export function LegalPageShell({
  title,
  lastUpdated,
  breadcrumbs,
  children,
}: LegalPageShellProps) {
  const formattedDate = new Date(lastUpdated).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} />

        {/* Page header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold font-heading text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Última actualización:{" "}
            <time dateTime={lastUpdated}>{formattedDate}</time>
          </p>
        </header>

        {/* Page content */}
        <div className="space-y-10">{children}</div>

        {/* Footer */}
        <footer className="mt-14 pt-8 border-t border-gray-200 dark:border-gray-800 text-[13px] text-gray-500 dark:text-gray-400 space-y-1">
          <p>
            <strong className="text-gray-700 dark:text-gray-300">
              Certus SPV, SLU
            </strong>{" "}
            · CIF B13852223 · C/ Castello 36, Planta 1ª, 28001 Madrid, España
          </p>
          <p>
            Contacto legal:{" "}
            <a
              href="mailto:legal@trafico.live"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              legal@trafico.live
            </a>
            {" · "}
            Delegado de Protección de Datos:{" "}
            {/* TODO: confirmar DPO */}
            <a
              href="mailto:dpo@trafico.live"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              dpo@trafico.live
            </a>
          </p>
          <p>
            <Link
              href="/aviso-legal"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              Aviso Legal
            </Link>
            {" · "}
            <Link
              href="/privacidad"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              Privacidad
            </Link>
            {" · "}
            <Link
              href="/cookies"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              Cookies
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
