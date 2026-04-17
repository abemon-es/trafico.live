import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { ArrowRight, Key, Activity, Bell, Plus } from "lucide-react";
import { PlanCard } from "@/components/dashboard/PlanCard";
import { TierBadge } from "@/components/dashboard/TierBadge";
import type { ApiTierName } from "@/lib/api-tiers";
import { API_TIERS } from "@/lib/api-tiers";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Panel de control — trafico.live",
  description:
    "Gestiona tus claves API, consulta el consumo en tiempo real y administra tu facturación.",
  alternates: { canonical: `${BASE_URL}/dashboard` },
  robots: { index: false, follow: true },
};

// --------------------------------------------------------------------------
// Data helpers
// --------------------------------------------------------------------------

async function getDashboardData(email: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parallelise all queries
  const [keys, todayUsage, activeAlerts, recentActivity] = await Promise.all([
    prisma.apiKey.findMany({
      where: { email, isActive: true },
      select: {
        id: true,
        name: true,
        key: true,
        tier: true,
        isActive: true,
        stripeCustomerId: true,
        createdAt: true,
        usage: {
          where: { date: { gte: today } },
          select: { requestCount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.apiUsage.aggregate({
      where: {
        key: { email },
        date: { gte: today },
      },
      _sum: { requestCount: true },
    }),

    // Count active weather alerts
    prisma.weatherAlert
      .count({ where: { isActive: true } })
      .catch(() => 0),

    // Last 10 API usage records across all user keys
    prisma.apiUsage.findMany({
      where: { key: { email } },
      orderBy: { date: "desc" },
      take: 10,
      select: {
        date: true,
        endpoint: true,
        requestCount: true,
        key: { select: { name: true, tier: true } },
      },
    }),
  ]);

  const topKey = keys.reduce<(typeof keys)[0] | null>((best, k) => {
    const tierRank: Record<string, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
    if (!best) return k;
    return (tierRank[k.tier] ?? 0) > (tierRank[best.tier] ?? 0) ? k : best;
  }, null);

  const tier = (topKey?.tier ?? "FREE") as ApiTierName;
  const tierConfig = API_TIERS[tier];

  const totalToday = todayUsage._sum.requestCount ?? 0;
  const dailyLimit = tierConfig.rateLimitPerDay;
  const pctUsed =
    dailyLimit !== Number.MAX_SAFE_INTEGER && dailyLimit > 0
      ? Math.min(100, Math.round((totalToday / dailyLimit) * 100))
      : 0;

  return {
    tier,
    topKey,
    keys,
    totalToday,
    pctUsed,
    dailyLimit,
    activeAlertsCount: activeAlerts,
    recentActivity,
  };
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(d);
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email;
  const data = await getDashboardData(email);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-heading font-700 text-foreground">Resumen</h1>
        <p className="text-sm text-tl-500 font-body mt-1">
          Bienvenido a tu panel de control de trafico.live
        </p>
      </div>

      {/* Plan card */}
      <PlanCard
        tier={data.tier}
        stripeCustomerId={data.topKey?.stripeCustomerId}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today requests */}
        <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-4">
          <p className="text-xs text-tl-500 font-body mb-1">Peticiones hoy</p>
          <p className="font-mono text-2xl font-500 text-foreground">
            {new Intl.NumberFormat("es-ES").format(data.totalToday)}
          </p>
          {data.dailyLimit !== Number.MAX_SAFE_INTEGER && (
            <p className="text-xs text-tl-400 font-body mt-1">
              de {new Intl.NumberFormat("es-ES").format(data.dailyLimit)} / día
            </p>
          )}
        </div>

        {/* % limit used */}
        <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-4">
          <p className="text-xs text-tl-500 font-body mb-1">Límite diario usado</p>
          <p className="font-mono text-2xl font-500 text-foreground">
            {data.dailyLimit === Number.MAX_SAFE_INTEGER ? "—" : `${data.pctUsed}%`}
          </p>
          {data.dailyLimit !== Number.MAX_SAFE_INTEGER && (
            <div
              className="mt-2 h-1.5 rounded-full bg-tl-100 dark:bg-tl-800 overflow-hidden"
              role="progressbar"
              aria-valuenow={data.pctUsed}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${data.pctUsed}% del límite diario utilizado`}
            >
              <div
                className={`h-full rounded-full transition-all ${data.pctUsed > 80 ? "bg-signal-red" : data.pctUsed > 60 ? "bg-signal-amber" : "bg-tl-500"}`}
                style={{ width: `${data.pctUsed}%` }}
              />
            </div>
          )}
        </div>

        {/* Active keys */}
        <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-4">
          <p className="text-xs text-tl-500 font-body mb-1">Claves activas</p>
          <p className="font-mono text-2xl font-500 text-foreground">
            {data.keys.length}
          </p>
          <Link
            href="/dashboard/keys"
            className="text-xs text-tl-600 dark:text-tl-400 hover:text-tl-500 transition-colors font-body mt-1 inline-flex items-center gap-1"
          >
            Ver claves
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Alerts count */}
        <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-4">
          <p className="text-xs text-tl-500 font-body mb-1">Alertas activas</p>
          <p className="font-mono text-2xl font-500 text-foreground">
            {data.activeAlertsCount}
          </p>
          <Link
            href="/dashboard/alertas"
            className="text-xs text-tl-600 dark:text-tl-400 hover:text-tl-500 transition-colors font-body mt-1 inline-flex items-center gap-1"
          >
            Ver alertas
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/keys"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 hover:bg-tl-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear nueva clave
        </Link>
        <Link
          href="/dashboard/usage"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-tl-200 dark:border-tl-700 text-tl-700 dark:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-900 text-sm font-medium transition-colors"
        >
          <Activity className="w-4 h-4" />
          Ver uso detallado
        </Link>
        <Link
          href="/dashboard/alertas"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-tl-200 dark:border-tl-700 text-tl-700 dark:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-900 text-sm font-medium transition-colors"
        >
          <Bell className="w-4 h-4" />
          Gestionar alertas
        </Link>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-tl-100 dark:border-tl-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-tl-500" />
            <h2 className="text-base font-heading font-600 text-foreground">Actividad reciente</h2>
          </div>
          <Link
            href="/dashboard/usage"
            className="text-xs text-tl-600 dark:text-tl-400 hover:text-tl-500 transition-colors flex items-center gap-1"
          >
            Ver todo
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {data.recentActivity.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Key className="w-6 h-6 text-tl-300 mx-auto mb-2" />
            <p className="text-sm text-tl-500 font-body">Sin actividad todavía</p>
          </div>
        ) : (
          <table className="w-full text-sm" aria-label="Actividad reciente de la API">
            <thead>
              <tr className="border-b border-tl-100 dark:border-tl-800 bg-tl-50/50 dark:bg-tl-900/30">
                <th scope="col" className="text-left px-5 py-2.5 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                  Fecha
                </th>
                <th scope="col" className="text-left px-5 py-2.5 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                  Endpoint
                </th>
                <th scope="col" className="text-left px-5 py-2.5 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                  Clave
                </th>
                <th scope="col" className="text-left px-5 py-2.5 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                  Plan
                </th>
                <th scope="col" className="text-right px-5 py-2.5 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                  Peticiones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tl-100 dark:divide-tl-800">
              {data.recentActivity.map((row, i) => (
                <tr key={i} className="hover:bg-tl-50/50 dark:hover:bg-tl-900/20 transition-colors">
                  <td className="px-5 py-3 text-xs text-tl-500 font-body whitespace-nowrap">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-5 py-3">
                    <code className="text-xs font-mono text-tl-600 dark:text-tl-300">
                      {row.endpoint}
                    </code>
                  </td>
                  <td className="px-5 py-3 text-xs text-tl-600 dark:text-tl-300 font-body">
                    {row.key.name}
                  </td>
                  <td className="px-5 py-3">
                    <TierBadge tier={row.key.tier as ApiTierName} />
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-foreground">
                    {new Intl.NumberFormat("es-ES").format(row.requestCount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
