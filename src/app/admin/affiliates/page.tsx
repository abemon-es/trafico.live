"use client";

import { useState, useEffect } from "react";
import { Info, RefreshCw, Loader2 } from "lucide-react";
import { PartnerTable, type PartnerRow } from "@/components/admin/affiliates/PartnerTable";
import { ClickChart, type ChartDataPoint } from "@/components/admin/affiliates/ClickChart";
import { RevenueStats } from "@/components/admin/affiliates/RevenueStats";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StatsResponse {
  _stub: boolean;
  _notice: string;
  summary: {
    totalClicks: number;
    totalConversions: number;
    totalRevenueEur: number;
    averageEpc: number;
  };
  partners: PartnerRow[];
  chart: ChartDataPoint[];
  period: number;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminAffiliatesPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  async function fetchStats(p: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/affiliates/stats?period=${p}`, {
        credentials: "same-origin",
        headers: {
          // In production this comes from a verified session cookie.
          // For S4 scaffold the layout handles access control.
          "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "",
        },
      });
      if (!res.ok) {
        if (res.status === 403) {
          setError("Acceso restringido. Solo admins.");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as StatsResponse;
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats(period);
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900 dark:text-gray-100">
            Dashboard de afiliados
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clicks, conversiones e ingresos por partner de afiliación.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchStats(period)}
          disabled={loading}
          aria-label="Actualizar datos"
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Stub disclosure banner */}
      <div className="rounded-xl border border-tl-amber-200 dark:border-tl-amber-800 bg-tl-amber-50 dark:bg-tl-amber-900/20 p-4 flex items-start gap-3">
        <Info
          className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-tl-amber-700 dark:text-tl-amber-300">
            Dashboard interno
          </p>
          <p className="text-xs text-tl-amber-600 dark:text-tl-amber-400 mt-0.5">
            Los datos mostrados llegarán cuando <code className="font-mono">AffiliateClick</code> esté
            activo en S4. Actualmente todos los valores son cero.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Período:</span>
        {([7, 30, 90] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={[
              "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
              period === p
                ? "bg-tl-600 text-white"
                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
            ].join(" ")}
          >
            {p}d
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-tl-500 animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* KPI tiles */}
          <RevenueStats summary={data.summary} />

          {/* Click/conversion chart */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Clicks y conversiones — últimos {period} días
            </h2>
            <ClickChart data={data.chart} />
          </div>

          {/* Partner table */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Partners activos
            </h2>
            <PartnerTable partners={data.partners} />
          </div>
        </>
      ) : null}
    </div>
  );
}
