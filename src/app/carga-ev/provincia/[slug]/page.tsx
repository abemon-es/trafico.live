import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import { provincePath } from "@/lib/geo/geo-paths";
import { evCitiesInProvince } from "@/lib/geo/ev-cities";
import { provinceCodeForSlug } from "@/lib/geo/ev-province";
import { DIRECTORY_PAGE_SIZE, pageHref, resolvePage } from "@/lib/seo/pagination";

// Every public charging point of the province, 100 per page, so each
// /carga-ev/punto/<id> page is reachable with a plain link (the city hubs only
// cover a fixed list of cities and cap at 500).
export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

function province(slug: string) {
  const code = provinceCodeForSlug(slug);
  const name = code ? PROVINCE_NAMES[code] : undefined;
  return code && name ? { code, name } : null;
}

const countFor = (code: string) => prisma.eVCharger.count({ where: { province: code, isPublic: true } });

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const prov = province(slug);
  if (!prov) return { title: "Provincia no encontrada" };
  const total = await countFor(prov.code).catch(() => 0);
  const r = resolvePage((await searchParams).page, total);
  if (r.kind !== "ok" || total === 0) return { title: "Página no encontrada" };
  const path = `/carga-ev/provincia/${slug}`;
  const url = `${BASE_URL}${pageHref(path, r.page)}`;
  const title =
    r.page === 1
      ? `Puntos de carga en la provincia de ${prov.name}`
      : `Puntos de carga en la provincia de ${prov.name}: página ${r.page} de ${r.pages}`;
  const description = `${total.toLocaleString("es-ES")} puntos de recarga públicos para coche eléctrico en la provincia de ${prov.name}, por municipio, con potencia y operador.`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url } };
}

export default async function EvProvincePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const prov = province(slug);
  if (!prov) notFound();

  const path = `/carga-ev/provincia/${slug}`;
  const total = await countFor(prov.code);
  if (total === 0) notFound();
  const resolved = resolvePage((await searchParams).page, total);
  if (resolved.kind === "redirect-to-first") permanentRedirect(path);
  if (resolved.kind === "not-found") notFound();
  const { page, pages } = resolved;

  const where = { province: prov.code, isPublic: true };
  const [items, byCity, byOperator, latest] = await Promise.all([
    prisma.eVCharger.findMany({
      where,
      orderBy: [{ city: "asc" }, { name: "asc" }, { id: "asc" }],
      skip: (page - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE,
      select: { id: true, name: true, address: true, city: true, operator: true, powerKw: true },
    }),
    page === 1
      ? prisma.eVCharger.groupBy({ by: ["city"], where, _count: true, orderBy: { _count: { city: "desc" } }, take: 10 })
      : Promise.resolve([]),
    page === 1
      ? prisma.eVCharger.groupBy({ by: ["operator"], where: { ...where, operator: { not: null } }, _count: true, orderBy: { _count: { operator: "desc" } }, take: 10 })
      : Promise.resolve([]),
    prisma.eVCharger.aggregate({ where, _max: { lastUpdated: true } }),
  ]);

  const updated = latest._max.lastUpdated;
  const cities = evCitiesInProvince(slug);
  const espana = provincePath(prov.code);
  const first = (page - 1) * DIRECTORY_PAGE_SIZE + 1;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Puntos de carga en la provincia de ${prov.name}`,
    numberOfItems: total,
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: first + i,
      name: c.name || c.address || c.id,
      url: `${BASE_URL}/carga-ev/punto/${encodeURIComponent(c.id)}`,
    })),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <StructuredData data={itemList} />
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Puntos de Recarga", href: "/carga-ev" },
          { name: "Provincias", href: "/carga-ev/provincia" },
          { name: prov.name, href: path },
        ]}
      />

      <h1 className="mt-4 text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
        Puntos de carga en la provincia de {prov.name}
        {page > 1 ? `: página ${page} de ${pages}` : ""}
      </h1>

      {page === 1 ? (
        <>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            La provincia de {prov.name} tiene{" "}
            <span className="font-mono font-semibold">{total.toLocaleString("es-ES")}</span> puntos de recarga públicos
            registrados
            {byCity.length > 0 ? `, y donde más hay es en ${byCity[0].city ?? "—"}` : ""}. Abajo están todos, por
            municipio, con su potencia y su operador; cada uno enlaza a su ficha con conectores, horario y forma de pago.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-2">Municipios con más puntos</h2>
              <ol className="space-y-1 text-sm">
                {byCity.map((c) => (
                  <li key={c.city ?? "-"} className="flex justify-between gap-3">
                    <span className="text-gray-800 dark:text-gray-200">{c.city ?? "Sin municipio"}</span>
                    <span className="font-mono tabular-nums text-gray-600 dark:text-gray-400">{c._count}</span>
                  </li>
                ))}
              </ol>
            </section>
            <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-2">Operadores</h2>
              {byOperator.length === 0 ? (
                <p className="text-sm text-gray-500">Sin operador declarado.</p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {byOperator.map((o) => (
                    <li key={o.operator ?? "-"} className="flex justify-between gap-3">
                      <span className="text-gray-800 dark:text-gray-200">{o.operator}</span>
                      <span className="font-mono tabular-nums text-gray-600 dark:text-gray-400">{o._count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Puntos {first}–{first + items.length - 1} de {total.toLocaleString("es-ES")}, por municipio. El resumen de la
          provincia está en la{" "}
          <Link href={path} className="text-tl-600 dark:text-tl-400 underline">
            primera página
          </Link>
          .
        </p>
      )}

      <section aria-labelledby="listado" className="mt-8">
        <h2 id="listado" className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Todos los puntos de carga
        </h2>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {items.map((c) => (
            <li key={c.id} className="px-4 py-2 text-sm flex flex-wrap gap-x-3">
              <Link
                href={`/carga-ev/punto/${encodeURIComponent(c.id)}`}
                className="font-medium text-tl-700 dark:text-tl-300 hover:underline"
              >
                {c.name || c.address || c.id}
              </Link>
              <span className="text-gray-600 dark:text-gray-400">{c.city ?? ""}</span>
              {c.powerKw != null && (
                <span className="font-mono tabular-nums text-gray-600 dark:text-gray-400">{Number(c.powerKw).toFixed(0)} kW</span>
              )}
              {c.operator && <span className="text-gray-500">{c.operator}</span>}
            </li>
          ))}
        </ul>
        {pages > 1 && (
          <nav aria-label="Páginas del listado" className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
              n === page ? (
                <span key={n} aria-current="page" className="px-3 py-1 rounded bg-tl-600 text-white text-sm font-mono">
                  {n}
                </span>
              ) : (
                <Link
                  key={n}
                  href={pageHref(path, n)}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm font-mono text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {n}
                </Link>
              )
            )}
          </nav>
        )}
      </section>

      <section className="mt-8 text-sm space-y-2">
        {cities.length > 0 && (
          <p>
            Por ciudad:{" "}
            {cities.map((c, i) => (
              <span key={c.slug}>
                {i > 0 ? " · " : ""}
                <Link href={`/carga-ev/${c.slug}`} className="text-tl-600 dark:text-tl-400 hover:underline">
                  puntos de carga en {c.name}
                </Link>
              </span>
            ))}
          </p>
        )}
        <p>
          {espana && (
            <Link href={espana} className="text-tl-600 dark:text-tl-400 hover:underline">
              Tráfico y movilidad en la provincia de {prov.name}
            </Link>
          )}
          {espana ? " · " : ""}
          <Link href="/carga-ev/provincia" className="text-tl-600 dark:text-tl-400 hover:underline">
            Puntos de carga por provincia
          </Link>
        </p>
        <p className="text-xs text-gray-500">
          Fuente: DGT, Punto de Acceso Nacional (datos de electrolineras del MITERD).
          {updated
            ? ` Datos descargados de la fuente el ${updated.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" })}.`
            : ""}
        </p>
      </section>
    </main>
  );
}
