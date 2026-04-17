import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export interface ErrorStateProps {
  title?: string;
  message?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  severity?: "error" | "warning";
  className?: string;
}

const SEVERITY = {
  error: {
    wrap: "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40",
    icon: "text-signal-red bg-red-100 dark:bg-red-900/30",
  },
  warning: {
    wrap: "border-tl-amber-200 bg-tl-amber-50 dark:bg-tl-amber-900/10 dark:border-tl-amber-700/40",
    icon: "text-tl-amber-500 bg-tl-amber-50 dark:bg-tl-amber-900/20",
  },
} as const;

export function ErrorState({
  title = "No se pudieron cargar los datos",
  message = "Vuelve a intentarlo en unos segundos o comprueba tu conexión.",
  icon: Icon = AlertTriangle,
  action,
  severity = "error",
  className,
}: ErrorStateProps) {
  const styles = SEVERITY[severity];

  return (
    <div
      role="alert"
      className={[
        "rounded-xl border p-6 flex flex-col items-center text-center gap-3",
        styles.wrap,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={`w-12 h-12 rounded-full flex items-center justify-center ${styles.icon}`}
      >
        <Icon className="w-6 h-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
