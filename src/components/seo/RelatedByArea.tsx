import Link from "next/link";

interface RelatedByAreaProps {
  province?: string;
  city?: string;
  currentPath: string;
}

/**
 * Cross-links related content by geographic area.
 * Distributes link equity across page types for the same location.
 */
export function RelatedByArea({ province, city, currentPath }: RelatedByAreaProps) {
  if (!province && !city) return null;

  const slug = (city || province || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  const links = [
    { href: `/gasolineras/precios/${slug}`, label: "Precios combustible" },
    { href: `/radares/provincia/${slug}`, label: "Radares" },
    { href: `/estadisticas/accidentes/${slug}`, label: "Accidentalidad" },
    ...(city
      ? [
          { href: `/ciudad/${slug}`, label: `Tráfico en ${city}` },
          { href: `/camaras/${slug}`, label: "Cámaras DGT" },
          { href: `/gasolineras/baratas/${slug}`, label: "Gasolineras baratas" },
        ]
      : []),
  ].filter((l) => l.href !== currentPath);

  if (links.length === 0) return null;

  return (
    <nav aria-label="Contenido relacionado en esta zona" className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        También en {city || province}
      </h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-tl-50 hover:text-tl-700 dark:hover:bg-tl-900/30 dark:hover:text-tl-300 border border-gray-200 dark:border-gray-800 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
