import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { Bell, ArrowRight, AlertTriangle, Info, Wind } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alertas — Panel de control | trafico.live",
  robots: { index: false, follow: true },
};

// --------------------------------------------------------------------------
// Shared alert types (read-only summary — management is at /alertas)
// --------------------------------------------------------------------------

interface AlertSummaryItem {
  id: string;
  title: string;
  type: string;
  severity: string;
  startsAt: Date;
  endsAt: Date | null;
  isActive: boolean;
}

// Type label maps
const WEATHER_TYPE_LABELS: Record<string, string> = {
  RAIN: "Lluvia",
  SNOW: "Nieve",
  ICE: "Hielo",
  FOG: "Niebla",
  WIND: "Viento",
  TEMPERATURE: "Temperatura",
  STORM: "Tormenta",
  COASTAL: "Costera",
  OTHER: "Meteorológica",
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  ACCIDENT: "Accidente",
  WORKS: "Obras",
  OBSTACLE: "Obstáculo",
  WEATHER: "Meteorología",
  CONGESTION: "Retención",
  CLOSURE: "Corte",
  OTHER: "Incidencia",
};

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-tl-50 text-tl-600 dark:bg-tl-900/40 dark:text-tl-300 border-tl-200 dark:border-tl-700",
  MEDIUM: "bg-tl-amber-50 text-tl-amber-700 dark:bg-tl-amber-900/20 dark:text-tl-amber-300 border-tl-amber-200 dark:border-tl-amber-700",
  HIGH: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800",
  VERY_HIGH: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-300 dark:border-red-700",
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  VERY_HIGH: "Muy alta",
};

function AlertIcon({ type }: { type: string }) {
  if (type === "WIND" || type === "RAIN" || type === "SNOW" || type === "FOG") {
    return <Wind className="w-4 h-4" />;
  }
  if (type === "ROAD" || type === "INCIDENT") {
    return <AlertTriangle className="w-4 h-4" />;
  }
  return <Info className="w-4 h-4" />;
}

function formatDateRange(start: Date, end: Date | null): string {
  const startStr = new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(start);

  if (!end) return `desde ${startStr}`;

  const endStr = new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(end);

  return `${startStr} → ${endStr}`;
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default async function AlertasPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Fetch a summary of active alerts (weather + traffic) — read-only overview
  // NOTE: /alertas (B9) owns the full CRUD management UI
  const [weatherAlerts, incidentAlerts] = await Promise.all([
    prisma.weatherAlert.findMany({
      where: { isActive: true },
      orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
      take: 20,
      select: {
        id: true,
        type: true,
        severity: true,
        provinceName: true,
        description: true,
        startedAt: true,
        endedAt: true,
        isActive: true,
      },
    })
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          title:
            r.description?.slice(0, 80) ??
            `${WEATHER_TYPE_LABELS[r.type] ?? r.type}${r.provinceName ? ` — ${r.provinceName}` : ""}`,
          type: r.type,
          severity: r.severity,
          startsAt: r.startedAt,
          endsAt: r.endedAt,
          isActive: r.isActive,
        }))
      )
      .catch(() => [] as AlertSummaryItem[]),

    prisma.trafficIncident.findMany({
      where: { endedAt: null },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        severity: true,
        description: true,
        roadNumber: true,
        startedAt: true,
        endedAt: true,
      },
    })
      .catch(
        () =>
          [] as Array<{
            id: string;
            type: string;
            severity: string;
            description: string | null;
            roadNumber: string | null;
            startedAt: Date;
            endedAt: Date | null;
          }>
      )
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          title:
            r.description?.slice(0, 80) ??
            `${INCIDENT_TYPE_LABELS[r.type] ?? r.type}${r.roadNumber ? ` — ${r.roadNumber}` : ""}`,
          type: r.type,
          severity: r.severity,
          startsAt: r.startedAt,
          endsAt: r.endedAt,
          isActive: true,
        }))
      ),
  ]);

  const allAlerts: AlertSummaryItem[] = [...weatherAlerts, ...incidentAlerts].sort(
    (a, b) => {
      const rankSeverity: Record<string, number> = { VERY_HIGH: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (rankSeverity[b.severity] ?? 0) - (rankSeverity[a.severity] ?? 0);
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-700 text-foreground">Alertas activas</h1>
          <p className="text-sm text-tl-500 font-body mt-1">
            Resumen de alertas meteorológicas e incidencias de tráfico en España
          </p>
        </div>
        <Link
          href="/alertas"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 hover:bg-tl-700 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Bell className="w-4 h-4" />
          Gestionar mis alertas
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Count badges */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-tl-200 dark:border-tl-700 bg-white dark:bg-tl-950">
          <Wind className="w-3.5 h-3.5 text-tl-500" />
          <span className="text-sm font-body text-tl-600 dark:text-tl-300">
            <span className="font-mono font-500 text-foreground">{weatherAlerts.length}</span>{" "}
            meteorológicas
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-tl-200 dark:border-tl-700 bg-white dark:bg-tl-950">
          <AlertTriangle className="w-3.5 h-3.5 text-tl-500" />
          <span className="text-sm font-body text-tl-600 dark:text-tl-300">
            <span className="font-mono font-500 text-foreground">{incidentAlerts.length}</span>{" "}
            incidencias
          </span>
        </div>
      </div>

      {/* Alerts list */}
      <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 overflow-hidden">
        <div className="px-5 py-4 border-b border-tl-100 dark:border-tl-800 flex items-center gap-2">
          <Bell className="w-4 h-4 text-tl-500" />
          <h2 className="text-base font-heading font-600 text-foreground">
            Alertas activas
            <span className="ml-2 text-xs font-mono text-tl-400 bg-tl-50 dark:bg-tl-900 border border-tl-100 dark:border-tl-800 rounded px-1.5 py-0.5 font-400">
              {allAlerts.length}
            </span>
          </h2>
        </div>

        {allAlerts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Bell className="w-8 h-8 text-tl-300 mx-auto mb-3" />
            <p className="text-sm text-tl-500 font-body">Sin alertas activas en este momento</p>
          </div>
        ) : (
          <ul className="divide-y divide-tl-100 dark:divide-tl-800" aria-label="Lista de alertas activas">
            {allAlerts.map((alert) => {
              const severityStyle = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.LOW;
              const severityLabel = SEVERITY_LABELS[alert.severity] ?? alert.severity;

              return (
                <li
                  key={alert.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-tl-50/50 dark:hover:bg-tl-900/20 transition-colors"
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg border shrink-0 mt-0.5 ${severityStyle}`}>
                    <AlertIcon type={alert.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground font-body truncate">
                        {alert.title}
                      </p>
                      <span
                        className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 border ${severityStyle}`}
                      >
                        {severityLabel}
                      </span>
                    </div>
                    <p className="text-xs text-tl-400 font-body mt-0.5">
                      {formatDateRange(alert.startsAt, alert.endsAt)}
                    </p>
                  </div>
                  <code className="text-xs font-mono text-tl-400 dark:text-tl-500 shrink-0">
                    {alert.type}
                  </code>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* CTA to full alert management */}
      <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-tl-50/50 dark:bg-tl-900/30 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground font-body">
            Gestiona tus alertas personalizadas
          </p>
          <p className="text-xs text-tl-500 font-body mt-0.5">
            Configura notificaciones por carretera, zona o tipo de incidente
          </p>
        </div>
        <Link
          href="/alertas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-500 transition-colors shrink-0"
        >
          Ir a alertas
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
