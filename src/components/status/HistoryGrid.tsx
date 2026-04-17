"use client";

import type { DailyHealth } from "@/lib/heartbeat";

function pctToClass(pct: number) {
  if (pct >= 99) return "bg-tl-500";
  if (pct >= 90) return "bg-tl-amber-400";
  if (pct >= 50) return "bg-tl-amber-600";
  return "bg-red-500";
}

export function HistoryGrid({ history }: { history: DailyHealth[] }) {
  const byTask = new Map<string, DailyHealth[]>();
  for (const h of history) {
    if (!byTask.has(h.task)) byTask.set(h.task, []);
    byTask.get(h.task)!.push(h);
  }
  const tasks = [...byTask.keys()].sort();
  const dates = history.length > 0 ? [...new Set(history.map((h) => h.date))].sort() : [];

  return (
    <section aria-label="Historial 7 días" className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid grid-cols-[160px_repeat(7,minmax(32px,1fr))] gap-1 text-xs">
          <div />
          {dates.map((d) => (
            <div key={d} className="text-center font-[family-name:var(--font-jetbrains-mono)] text-tl-500">
              {d.slice(8)}
            </div>
          ))}
          {tasks.map((task) => (
            <>
              <div
                key={`${task}-label`}
                className="truncate pr-2 text-tl-700 dark:text-tl-200"
                title={task}
              >
                {task}
              </div>
              {byTask.get(task)!.map((d) => (
                <div
                  key={`${task}-${d.date}`}
                  className={`h-6 rounded ${pctToClass(d.healthyPct)} motion-reduce:transition-none`}
                  title={`${task} · ${d.date} · ${d.healthyPct}%`}
                  aria-label={`${task} ${d.date}: ${d.healthyPct}% saludable`}
                />
              ))}
            </>
          ))}
        </div>
      </div>
    </section>
  );
}
