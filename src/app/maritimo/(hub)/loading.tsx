/**
 * Skeleton de carga para /maritimo — mapa AIS oscuro + panel de buques.
 */
export default function MaritimoLoading() {
  return (
    <div
      className="min-h-screen bg-gray-950"
      aria-label="Cargando…"
      aria-busy="true"
    >
      {/* Breadcrumb strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="h-4 w-48 rounded bg-gray-800 animate-pulse" />
      </div>

      {/* Hero AIS map — dark */}
      <div className="relative w-full h-[420px] sm:h-[520px] bg-slate-900 animate-pulse mt-4">
        {/* Active vessels chip */}
        <div className="absolute top-4 left-4 h-8 w-36 rounded-full bg-white/10 animate-pulse" />
        {/* Layer toggle placeholder */}
        <div className="absolute top-4 right-4 h-8 w-20 rounded-lg bg-white/10 animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-gray-900 border border-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Hub links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-gray-900 border border-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
