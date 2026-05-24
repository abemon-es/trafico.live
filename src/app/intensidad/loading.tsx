/**
 * Skeleton de carga para /intensidad — mapa IMD + tabla de datos.
 */
export default function IntensidadLoading() {
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

      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="h-8 w-80 rounded bg-gray-200 dark:bg-gray-800 animate-pulse mb-2" />
        <div className="h-4 w-96 rounded bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
      </div>

      {/* Sensor map placeholder */}
      <div className="relative w-full h-[420px] sm:h-[500px] bg-tl-50 dark:bg-slate-900 animate-pulse">
        <div className="absolute top-4 right-4 h-24 w-40 rounded-xl bg-white/60 dark:bg-white/10 animate-pulse" />
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

      {/* Data table skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800 animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
