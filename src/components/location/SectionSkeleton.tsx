interface SectionSkeletonProps {
  title: string;
}

export function SectionSkeleton({ title }: SectionSkeletonProps) {
  return (
    <section
      aria-busy="true"
      aria-label={`Cargando sección: ${title}`}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded bg-gray-200" aria-hidden="true" />
        <h2 className="font-heading text-lg font-semibold text-gray-300">{title}</h2>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </section>
  );
}
