import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { COMMUNITIES, PROVINCES } from "@/lib/geo/ine-codes";
import { evProvincePath } from "@/lib/geo/ev-province";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Puntos de carga por provincia",
  description:
    "Puntos de recarga públicos para coche eléctrico en cada provincia de España, con la lista completa de cada una.",
  alternates: { canonical: `${BASE_URL}/carga-ev/provincia` },
};

export default async function EvProvinceIndexPage() {
  const counts = new Map<string, number>(
    (
      await prisma.eVCharger
        .groupBy({ by: ["province"], where: { isPublic: true, province: { not: null } }, _count: true })
        .catch(() => [] as Array<{ province: string | null; _count: number }>)
    ).map((r) => [r.province ?? "", r._count])
  );

  const groups = COMMUNITIES.map((c) => ({
    name: c.name,
    provinces: PROVINCES.filter((p) => p.communityCode === c.code).sort((a, b) => a.name.localeCompare(b.name, "es")),
  })).filter((g) => g.provinces.length > 0);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Puntos de Recarga", href: "/carga-ev" },
          { name: "Provincias", href: "/carga-ev/provincia" },
        ]}
      />
      <h1 className="mt-4 text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
        Puntos de carga por provincia
      </h1>
      <p className="mt-3 text-gray-700 dark:text-gray-300">
        Elige una provincia para ver todos sus puntos de recarga públicos, por municipio. Fuente: DGT, Punto de Acceso
        Nacional (datos del MITERD).
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.name}>
            <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">{g.name}</h2>
            <ul className="space-y-1 text-sm">
              {g.provinces.map((p) => {
                const n = counts.get(p.code) ?? 0;
                const href = evProvincePath(p.code);
                return (
                  <li key={p.code} className="flex justify-between gap-3">
                    {n > 0 && href ? (
                      <Link href={href} className="text-tl-600 dark:text-tl-400 hover:underline">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="text-gray-500">{p.name}</span>
                    )}
                    <span className="font-mono tabular-nums text-gray-600 dark:text-gray-400">{n.toLocaleString("es-ES")}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
