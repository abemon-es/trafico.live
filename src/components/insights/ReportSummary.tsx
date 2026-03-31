/**
 * ReportSummary — structured KPI block for report pages.
 *
 * Renders 3-5 key metrics in a visual grid at the top of a report,
 * before the prose body. Satisfies the "Type A" reader (commuter at 7am
 * who wants one number and leaves) without changing the article format
 * for "Type B" readers who read the full report.
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface ReportMetric {
  label: string;
  value: string;
  unit?: string;
  change?: number; // % change — triggers trend arrow
  context?: string; // e.g., "media 30d: 234"
  highlight?: boolean; // renders in brand color
}

interface ReportSummaryProps {
  metrics: ReportMetric[];
  source?: string;
  updatedAt?: string;
}

export function ReportSummary({
  metrics,
  source,
  updatedAt,
}: ReportSummaryProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 mb-8">
      <div
        className={`grid gap-4 ${
          metrics.length <= 3
            ? "grid-cols-1 sm:grid-cols-3"
            : metrics.length === 4
              ? "grid-cols-2 sm:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        }`}
      >
        {metrics.map((metric, i) => (
          <div
            key={i}
            className={`text-center p-3 rounded-lg ${
              metric.highlight
                ? "bg-tl-50 dark:bg-tl-950/30 border border-tl-200 dark:border-tl-800"
                : "bg-gray-50 dark:bg-gray-800/50"
            }`}
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              {metric.label}
            </p>
            <p
              className={`text-2xl font-bold font-mono ${
                metric.highlight
                  ? "text-tl-600 dark:text-tl-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {metric.value}
              {metric.unit && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                  {metric.unit}
                </span>
              )}
            </p>
            {metric.change !== undefined && metric.change !== 0 && (
              <p
                className={`text-xs mt-1 flex items-center justify-center gap-1 ${
                  metric.change > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {metric.change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : metric.change < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {metric.change > 0 ? "+" : ""}
                {metric.change.toFixed(1)}%
              </p>
            )}
            {metric.context && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {metric.context}
              </p>
            )}
          </div>
        ))}
      </div>
      {(source || updatedAt) && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
          {source && <>Fuente: {source}</>}
          {source && updatedAt && <> · </>}
          {updatedAt && <>Actualizado: {updatedAt}</>}
        </p>
      )}
    </div>
  );
}
