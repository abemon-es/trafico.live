import Link from "next/link";

const GIT_SHA =
  process.env.NEXT_PUBLIC_GIT_SHA
    ? process.env.NEXT_PUBLIC_GIT_SHA.slice(0, 7)
    : "dev";

const LEGAL_LINKS: { name: string; href: string; external?: boolean }[] = [
  { name: "Aviso legal", href: "/aviso-legal" },
  { name: "Privacidad", href: "/politica-privacidad" },
  { name: "Cookies", href: "/cookies" },
  { name: "Términos", href: "/terminos" },
  { name: "Sitemap", href: "/sitemap.xml", external: true },
  { name: "Status", href: "https://status.trafico.live", external: true },
  { name: "API status", href: "https://status.trafico.live/api", external: true },
];

export function LegalStrip() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="w-full bg-ink-950 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Row 1: Brand tagline */}
        <div className="mb-3">
          <p className="text-sm font-heading font-semibold text-white">
            <span className="text-tl-300 mr-1" aria-hidden="true">⬡</span>
            trafico.live
            <span className="text-white/40 mx-2" aria-hidden="true">·</span>
            <span className="font-normal text-white/80">
              Inteligencia vial en tiempo real para España
            </span>
          </p>
          <p className="text-xs text-white/70 mt-1">
            Operado por Certus SPV · Desarrollado por{" "}
            <a
              href="https://abemon.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline decoration-white/30 hover:decoration-tl-300 hover:text-tl-200 transition-colors"
            >
              Abemon
            </a>{" "}
            · Murcia, España
          </p>
        </div>

        {/* Row 2: Legal links */}
        <div className="flex flex-wrap items-center gap-x-0 gap-y-1 mb-3">
          {LEGAL_LINKS.map((link, idx) => (
            <span key={link.href} className="inline-flex items-center">
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/75 hover:text-tl-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-400 rounded"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  href={link.href}
                  className="text-xs text-white/75 hover:text-tl-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-400 rounded"
                >
                  {link.name}
                </Link>
              )}
              {idx < LEGAL_LINKS.length - 1 && (
                <span
                  className="text-white/40 mx-2 select-none"
                  aria-hidden="true"
                >
                  ·
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Row 3: Copyright + build */}
        <p className="text-xs text-white/65 font-data">
          &copy; {currentYear} trafico.live
          <span className="mx-2 text-white/40" aria-hidden="true">·</span>
          <span className="font-mono">build {GIT_SHA}</span>
        </p>
      </div>
    </div>
  );
}
