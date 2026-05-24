/**
 * Skeleton de carga para /estaciones-aforo — mapa IMD de 14.400+ estaciones.
 */
export default function EstacionesAforoLoading() {
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-950"
      aria-label="Cargando…"
      aria-busy="true"
    >
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
      </div>

      {/* Full-viewport map placeholder */}
      <div className="relative w-full h-[520px] sm:h-[620px] bg-tl-50 dark:bg-slate-900 animate-pulse mt-4">
        {/* Legend chip */}
        <div className="absolute bottom-6 left-4 h-32 w-44 rounded-xl bg-white/70 dark:bg-white/10 animate-pulse" />
        {/* Layer toggle */}
        <div className="absolute top-4 right-4 h-8 w-32 rounded-lg bg-white/70 dark:bg-white/10 animate-pulse" />
        {/* Station count chip */}
        <div className="absolute top-4 left-4 h-8 w-40 rounded-full bg-white/70 dark:bg-white/10 animate-pulse" />
      </div>

      {/* Province filter row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
