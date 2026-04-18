import { CheckCircle2, AlertTriangle, XOctagon } from "lucide-react";
import type { CollectorStatus, OverallStatus } from "@/lib/heartbeat";

const STYLES: Record<CollectorStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  healthy: {
    icon: CheckCircle2,
    label: "Operativo",
    className: "bg-tl-50 text-tl-700 dark:bg-tl-950/50 dark:text-tl-200 border-tl-200 dark:border-tl-800",
  },
  degraded: {
    icon: AlertTriangle,
    label: "Degradado",
    className:
      "bg-tl-amber-50 text-tl-amber-800 dark:bg-tl-amber-950/50 dark:text-tl-amber-200 border-tl-amber-300 dark:border-tl-amber-700",
  },
  down: {
    icon: XOctagon,
    label: "Interrumpido",
    className: "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200 border-red-300 dark:border-red-800",
  },
};

export function StatusBadge({ status }: { status: CollectorStatus }) {
  const { icon: Icon, label, className } = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${className}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}

const BANNER_COPY: Record<OverallStatus, string> = {
  healthy: "Todos los sistemas operativos",
  degraded: "Funcionamiento parcial",
  down: "Interrupciones mayores",
};

export function OverallStatusBanner({ status }: { status: OverallStatus }) {
  const { icon: Icon, className } = STYLES[status];
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border-2 px-6 py-5 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-7 w-7" aria-hidden="true" />
        <p className="font-[family-name:var(--font-exo-2)] text-xl font-semibold">{BANNER_COPY[status]}</p>
      </div>
      <span className="relative h-3 w-3">
        <span
          className={`absolute inset-0 animate-ping rounded-full ${status === "healthy" ? "bg-tl-500" : status === "degraded" ? "bg-tl-amber-500" : "bg-red-500"} motion-reduce:animate-none`}
        />
        <span
          className={`relative inline-block h-3 w-3 rounded-full ${status === "healthy" ? "bg-tl-500" : status === "degraded" ? "bg-tl-amber-500" : "bg-red-500"}`}
        />
      </span>
    </div>
  );
}
