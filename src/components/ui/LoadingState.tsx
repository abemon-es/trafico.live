import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "spinner" | "skeleton" | "inline";

export interface LoadingStateProps {
  variant?: Variant;
  label?: string;
  rows?: number;
  className?: string;
  children?: ReactNode;
}

export function LoadingState({
  variant = "spinner",
  label = "Cargando…",
  rows = 3,
  className,
  children,
}: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={["flex flex-col gap-3", className ?? ""].filter(Boolean).join(" ")}
      >
        <span className="sr-only">{label}</span>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse"
            style={{ width: `${90 - i * 8}%` }}
          />
        ))}
        {children}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={[
          "inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={[
        "flex flex-col items-center justify-center gap-3 py-12 text-gray-500 dark:text-gray-400",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Loader2 className="w-8 h-8 animate-spin text-tl-600 dark:text-tl-400" aria-hidden="true" />
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonBlock({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return <LoadingState variant="skeleton" rows={lines} className={className} />;
}
