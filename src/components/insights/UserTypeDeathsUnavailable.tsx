/**
 * /inteligencia/camiones, /motociclistas and /ciclistas-y-peatones when their
 * deaths by user type can't be read (src/lib/user-type-deaths.ts returns
 * null): the title, a neutral notice, and the analyses that use every
 * accident. No charts and no computed sentences. The pages are noindex while
 * it shows (CMO, 2026-10-22).
 */

import Link from "next/link";
import { ChevronRight, Info, type LucideIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

/** The notice, and the pages' description and og:description while it shows (CMO). */
export const USER_TYPE_DEATHS_UNAVAILABLE =
  "Los datos de fallecidos no están disponibles en este momento. Inténtalo de nuevo en unos minutos.";

const MEANWHILE = [
  { title: "Hora punta y accidentes", href: "/inteligencia/hora-punta-y-accidentes" },
  { title: "Lluvia y accidentes", href: "/inteligencia/lluvia-y-accidentes" },
  { title: "Análisis de accidentes", href: "/analisis/accidentes" },
];

export function UserTypeDeathsUnavailable({
  title,
  icon: Icon,
  breadcrumbs,
}: {
  title: string;
  icon: LucideIcon;
  breadcrumbs: { name: string; href: string }[];
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center">
          <Icon className="w-5 h-5 text-tl-600 dark:text-tl-400" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      </div>

      <div className="bg-tl-50 dark:bg-tl-950/30 border border-tl-200 dark:border-tl-800 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-tl-600 dark:text-tl-400 mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-tl-800 dark:text-tl-200">{USER_TYPE_DEATHS_UNAVAILABLE}</p>
        </div>
      </div>

      <section aria-labelledby="mientras-tanto">
        <p id="mientras-tanto" className="text-gray-700 dark:text-gray-300 mb-3">
          Mientras tanto, estos análisis usan todos los accidentes con víctimas:
        </p>
        <ul className="space-y-2">
          {MEANWHILE.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex items-center gap-1 text-tl-700 dark:text-tl-300 hover:underline font-medium"
              >
                {l.title}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
