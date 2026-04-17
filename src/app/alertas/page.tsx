"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Plus, Crown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AlertCard, type UserAlert } from "@/components/alertas/AlertCard";
import { PushPermissionPrompt } from "@/components/alertas/PushPermissionPrompt";
import { EmptyState } from "@/components/ui/EmptyState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AlertsResponse {
  alerts: UserAlert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AlertasPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // TODO(B1): Replace with real session userId once B1's auth() is wired.
  const userId: string | null = null;

  const fetchAlerts = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/alerts?page=${p}`, { credentials: "same-origin" });
      if (!res.ok) {
        if (res.status === 401) {
          setError("auth");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as AlertsResponse;
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Error al cargar alertas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(page);
  }, [page, fetchAlerts]);

  async function handleToggle(id: string, newStatus: "ACTIVE" | "PAUSED") {
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: newStatus }),
    });
    setData((prev) =>
      prev
        ? {
            ...prev,
            alerts: prev.alerts.map((a) =>
              a.id === id ? { ...a, status: newStatus } : a
            ),
          }
        : prev
    );
  }

  async function handleDelete(id: string) {
    await fetch(`/api/alerts/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        alerts: prev.alerts.filter((a) => a.id !== id),
        pagination: {
          ...prev.pagination,
          total: prev.pagination.total - 1,
        },
      };
    });
  }

  // Auth guard (B1 replaces this)
  if (error === "auth") {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <EmptyState
          icon={Bell}
          title="Inicia sesión para ver tus alertas"
          description="Necesitas una cuenta para gestionar alertas de tráfico personalizadas."
          action={{ label: "Iniciar sesión", href: "/login" }}
        />
      </main>
    );
  }

  return (
    <>
      <PushPermissionPrompt userId={userId} />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6" id="main-content">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400" aria-label="Ruta de navegación">
          <Link href="/" className="hover:text-[var(--tl-primary)] transition-colors">
            Inicio
          </Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-gray-900 dark:text-gray-100 font-semibold">Mis alertas</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-gray-900 dark:text-gray-100">
              Mis alertas
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">
              Recibe notificaciones de incidencias, trenes y vuelos personalizadas.
            </p>
          </div>
          <Link
            href="/alertas/nueva"
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 text-white font-semibold text-sm hover:bg-tl-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nueva alerta
          </Link>
        </div>

        {/* Premium banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
          className="rounded-xl border border-tl-amber-200 dark:border-tl-amber-800 bg-tl-amber-50 dark:bg-tl-amber-900/20 p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-tl-amber-100 dark:bg-tl-amber-900/40 flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-tl-amber-700 dark:text-tl-amber-300">
              Mejora a Premium — 4,99&thinsp;€/mes
            </p>
            <p className="text-xs text-tl-amber-600 dark:text-tl-amber-400">
              Alertas ilimitadas · prioridad en el procesado · canal Telegram · exportación
            </p>
          </div>
          <Link
            href="/api-docs#premium"
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-tl-amber-500 text-white hover:bg-tl-amber-600 transition-colors"
          >
            Ver planes
          </Link>
        </motion.div>

        {/* Alert list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : !data || data.alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Sin alertas aún"
            description="Crea tu primera alerta para recibir notificaciones de incidencias en carreteras, retrasos de trenes o el estado de tus vuelos."
            action={{ label: "Crear primera alerta", href: "/alertas/nueva" }}
          />
        ) : (
          <>
            <AnimatePresence initial={false}>
              <div className="space-y-3">
                {data.alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </AnimatePresence>

            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {data.pagination.total} alertas · Página {data.pagination.page} de{" "}
                  {data.pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="Página anterior"
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                    }
                    disabled={page >= data.pagination.totalPages}
                    aria-label="Página siguiente"
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
