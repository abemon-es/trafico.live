import type { Metadata } from "next";
import { OverallStatusBanner } from "@/components/status/StatusBadge";
import { ServicePanel } from "@/components/status/ServicePanel";
import { HistoryGrid } from "@/components/status/HistoryGrid";
import { IncidentLog } from "@/components/status/IncidentLog";
import { StatusAutoRefresh } from "@/components/status/StatusAutoRefresh";
import { classifyOverall, getCollectorStatuses, getSevenDayHistory } from "@/lib/heartbeat";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData, generateWebPageSchema } from "@/components/seo/StructuredData";

export const revalidate = 30;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Estado del servicio — trafico.live",
  description:
    "Monitorización en tiempo real de la plataforma trafico.live: web, API, collectors de datos y base de datos.",
  alternates: { canonical: `${BASE_URL}/status` },
  openGraph: {
    title: "Estado — trafico.live",
    description: "Estado en vivo de la plataforma",
    url: `${BASE_URL}/status`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default async function StatusPage() {
  const [collectors, history] = await Promise.all([getCollectorStatuses(), getSevenDayHistory()]);
  const overall = classifyOverall(collectors);
  const incidents: Array<{
    id: string;
    service: string;
    severity: string;
    title: string;
    description?: string | null;
    startedAt: Date;
    resolvedAt?: Date | null;
  }> = []; // TODO: replace once T3.6 applies docs/PRISMA-PROPOSAL-T4-STATUS.md

  const schema = generateWebPageSchema({
    title: "Estado del servicio — trafico.live",
    description:
      "Monitorización en tiempo real de la plataforma trafico.live: web, API, collectors de datos y base de datos.",
    url: `${BASE_URL}/status`,
  });

  return (
    <>
      <StructuredData data={schema} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Estado", href: "/status" },
          ]}
        />
        <StatusAutoRefresh intervalSec={30} />
        <header className="mb-8 mt-4">
          <h1 className="font-[family-name:var(--font-exo-2)] text-4xl font-bold text-tl-900 dark:text-tl-50">
            Estado del servicio
          </h1>
          <p className="mt-2 text-tl-600 dark:text-tl-300">
            Monitorización automática · actualizado cada 30 segundos
          </p>
        </header>

        <OverallStatusBanner status={overall} />

        <section aria-label="Servicios" className="mt-10">
          <h2 className="mb-4 font-[family-name:var(--font-exo-2)] text-2xl font-semibold text-tl-900 dark:text-tl-50">
            Collectors de datos
          </h2>
          {collectors.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collectors.map((c) => (
                <ServicePanel key={c.task} collector={c} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-tl-200 p-6 text-center text-sm text-tl-500 dark:border-tl-800 dark:text-tl-400">
              Sin datos de heartbeat recientes. Comprobando…
            </p>
          )}
        </section>

        <section aria-label="Historial 7 días" className="mt-10">
          <h2 className="mb-4 font-[family-name:var(--font-exo-2)] text-2xl font-semibold text-tl-900 dark:text-tl-50">
            Últimos 7 días
          </h2>
          <HistoryGrid history={history} />
        </section>

        <section aria-label="Incidentes" className="mt-10">
          <h2 className="mb-4 font-[family-name:var(--font-exo-2)] text-2xl font-semibold text-tl-900 dark:text-tl-50">
            Incidentes recientes
          </h2>
          <IncidentLog incidents={incidents} />
        </section>

        <footer className="mt-12 border-t border-tl-100 pt-6 text-sm text-tl-500 dark:border-tl-900 dark:text-tl-400">
          ¿Recibir avisos? Crea una alerta en{" "}
          <a href="/alertas?type=status" className="text-tl-700 underline hover:text-tl-900 dark:text-tl-200">
            /alertas
          </a>
          .
        </footer>
      </main>
    </>
  );
}
