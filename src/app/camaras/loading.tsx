/**
 * Skeleton de carga para /camaras — cuadrícula de miniaturas de cámara.
 */
export default function CamarasLoading() {
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
        <div className="h-8 w-64 rounded bg-gray-200 dark:bg-gray-800 animate-pulse mb-2" />
        <div className="h-4 w-96 rounded bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
      </div>

      {/* Filter/search bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="h-10 w-full sm:w-80 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 animate-pulse" />
      </div>

      {/* Camera grid — aspect-video thumbnails */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gray-200 dark:bg-gray-800" />
              {/* Card footer */}
              <div className="p-3 space-y-1.5">
                <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
