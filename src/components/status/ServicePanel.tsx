import type { CollectorHealth } from "@/lib/heartbeat";
import { StatusBadge } from "./StatusBadge";

function relative(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

export function ServicePanel({ collector }: { collector: CollectorHealth }) {
  return (
    <article className="rounded-xl border border-tl-100 bg-white p-5 dark:border-tl-900 dark:bg-tl-950/50">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-[family-name:var(--font-exo-2)] text-lg font-semibold text-tl-900 dark:text-tl-50">
          {collector.task}
        </h3>
        <StatusBadge status={collector.status} />
      </header>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-tl-500 dark:text-tl-400">Último latido</dt>
          <dd className="font-[family-name:var(--font-jetbrains-mono)] text-tl-800 dark:text-tl-100">
            {relative(collector.lastBeat)}
          </dd>
        </div>
        <div>
          <dt className="text-tl-500 dark:text-tl-400">Edad</dt>
          <dd className="font-[family-name:var(--font-jetbrains-mono)] text-tl-800 dark:text-tl-100">
            {collector.ageMinutes} min
          </dd>
        </div>
      </dl>
      {collector.errorMessage ? (
        <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-200">
          {collector.errorMessage}
        </p>
      ) : null}
    </article>
  );
}
