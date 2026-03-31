/**
 * StalenessIndicator — shows freshness warning on old reports.
 *
 * After 72 hours, daily reports show a visual indicator:
 * "Este informe cubre el martes 29. Ver informe actual →"
 */

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface StalenessIndicatorProps {
  publishedAt: Date;
  currentReportUrl?: string;
  currentReportLabel?: string;
}

export function StalenessIndicator({
  publishedAt,
  currentReportUrl,
  currentReportLabel = "Ver informe actual",
}: StalenessIndicatorProps) {
  const now = new Date();
  const ageHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

  if (ageHours < 72) return null;

  const dateLabel = publishedAt.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Este informe cubre el <span className="font-medium capitalize">{dateLabel}</span>.
        </p>
        {currentReportUrl && (
          <Link
            href={currentReportUrl}
            className="text-sm text-tl-600 dark:text-tl-400 hover:underline font-medium mt-1 inline-block"
          >
            {currentReportLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}
