/**
 * A vehicle page while AccidentMicrodata has no vehicle types
 * (src/lib/accident-vehicles.ts): its title, the notice, and the analyses
 * that do use every accident. No charts and no computed sentences: with the
 * flags empty they were all-accident figures under a truck, motorcycle or
 * cyclist title (CMO, 2026-10-22).
 */

import Link from "next/link";
import { ChevronRight, Info, type LucideIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const VEHICLE_DATA_PENDING =
  "Todavía no tenemos el desglose por tipo de vehículo: la tabla muestra todos los accidentes con víctimas.";

const MEANWHILE = [
  { title: "Hora punta y accidentes", href: "/inteligencia/hora-punta-y-accidentes" },
  { title: "Lluvia y accidentes", href: "/inteligencia/lluvia-y-accidentes" },
  { title: "Análisis de accidentes", href: "/analisis/accidentes" },
];

export function VehicleDataPending({
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
          <p className="text-sm font-medium text-tl-800 dark:text-tl-200">{VEHICLE_DATA_PENDING}</p>
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
