import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import TerrestresClient from "./TerrestresClient";

export const revalidate = 3600;

export default async function TerrestresPage() {
  const [stations, total] = await Promise.all([
    prisma.gasStation.findMany({
      take: 20,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
        locality: true,
        provinceName: true,
        province: true,
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
        priceGLP: true,
        is24h: true,
        schedule: true,
        lastPriceUpdate: true,
      },
    }),
    prisma.gasStation.count(),
  ]);

  // Convert Prisma Decimal to plain numbers for serialization
  const serializedStations = stations.map((s) => ({
    id: s.id,
    name: s.name,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    address: s.address,
    locality: s.locality,
    provinceName: s.provinceName,
    province: s.province,
    priceGasoleoA: s.priceGasoleoA ? Number(s.priceGasoleoA) : null,
    priceGasolina95E5: s.priceGasolina95E5 ? Number(s.priceGasolina95E5) : null,
    priceGasolina98E5: s.priceGasolina98E5 ? Number(s.priceGasolina98E5) : null,
    priceGLP: s.priceGLP ? Number(s.priceGLP) : null,
    is24h: s.is24h,
    schedule: s.schedule,
    lastPriceUpdate: s.lastPriceUpdate?.toISOString() || new Date().toISOString(),
  }));

  const initialData = {
    success: true,
    data: serializedStations,
    pagination: {
      total,
      page: 1,
      pageSize: 20,
      totalPages: Math.ceil(total / 20),
    },
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Gasolineras", href: "/gasolineras" },
          { name: "Terrestres", href: "/gasolineras/terrestres" },
        ]} />
      </div>
      <TerrestresClient initialData={initialData} />
      {/* Server-rendered station links for SEO — ensures Google can discover detail pages */}
      {serializedStations.length > 0 && (
        <nav aria-label="Gasolineras destacadas" className="max-w-7xl mx-auto px-4 pb-8">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Gasolineras en España — {total.toLocaleString("es-ES")} estaciones
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            {serializedStations.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/gasolineras/terrestres/${s.id}`}
                  className="hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                >
                  {s.name}{s.locality ? ` · ${s.locality}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
