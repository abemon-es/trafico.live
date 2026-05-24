/**
 * Skeleton de carga para /barcos/mapa — tracker AIS a pantalla completa (oscuro).
 */
export default function BarcosMapaLoading() {
  return (
    <div
      className="w-full h-screen bg-slate-950 animate-pulse"
      aria-label="Cargando…"
      aria-busy="true"
    >
      {/* Category filter bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 rounded-full bg-white/10 animate-pulse"
          />
        ))}
      </div>

      {/* Vessel detail sidebar hint */}
      <div className="absolute bottom-8 right-4 h-48 w-56 rounded-2xl bg-white/10 animate-pulse" />

      {/* Zoom controls */}
      <div className="absolute bottom-8 left-4 flex flex-col gap-1">
        <div className="h-8 w-8 rounded bg-white/10 animate-pulse" />
        <div className="h-8 w-8 rounded bg-white/10 animate-pulse" />
      </div>
    </div>
  );
}
