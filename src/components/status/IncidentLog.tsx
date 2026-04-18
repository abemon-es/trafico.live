interface Incident {
  id: string;
  service: string;
  severity: string;
  title: string;
  description?: string | null;
  startedAt: Date;
  resolvedAt?: Date | null;
}

export function IncidentLog({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-tl-200 bg-tl-50/30 p-6 text-center text-sm text-tl-600 dark:border-tl-800 dark:bg-tl-950/30 dark:text-tl-400">
        No hay incidentes recientes.
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {incidents.map((i) => (
        <li
          key={i.id}
          className="rounded-lg border border-tl-100 bg-white p-4 dark:border-tl-900 dark:bg-tl-950/40"
        >
          <header className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-tl-900 dark:text-tl-50">{i.title}</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-tl-500">
              {new Date(i.startedAt).toISOString().slice(0, 16).replace("T", " ")}
            </span>
          </header>
          {i.description ? (
            <p className="mt-1 text-sm text-tl-700 dark:text-tl-200">{i.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
