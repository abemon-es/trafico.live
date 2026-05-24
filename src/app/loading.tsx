/**
 * Skeleton de carga para la página principal (homepage).
 * Aproxima el layout: ticker strip + mapa hero + sección de enlaces.
 */
export default function HomeLoading() {
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-950"
      aria-label="Cargando…"
      aria-busy="true"
    >
      {/* Ticker strip placeholder */}
      <div className="h-9 bg-tl-800/90 animate-pulse" />

      {/* Hero map placeholder */}
      <div className="relative w-full h-[480px] sm:h-[560px] bg-tl-900 animate-pulse">
        {/* Stat chips row */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          {[80, 64, 72, 56].map((w, i) => (
            <div
              key={i}
              className="h-8 rounded-full bg-white/10 animate-pulse"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
      </div>

      {/* Section links grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
