/**
 * Skeleton de carga para /calidad-aire — mapa ICA + distribución por provincia.
 */
export default function CalidadAireLoading() {
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

      {/* Hero map — light */}
      <div className="relative w-full h-[420px] sm:h-[520px] bg-tl-50 dark:bg-slate-900 animate-pulse mt-4">
        {/* ICA legend */}
        <div className="absolute bottom-4 left-4 h-28 w-44 rounded-xl bg-white/70 dark:bg-white/10 animate-pulse" />
        {/* Station count chip */}
        <div className="absolute top-4 left-4 h-8 w-40 rounded-full bg-white/70 dark:bg-white/10 animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Province breakdown */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800 animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
