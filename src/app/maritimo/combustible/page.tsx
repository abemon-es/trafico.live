import { prisma } from "@/lib/db";
import MaritimasClient from "./MaritimasClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function CombustibleMaritimoPage() {
  const [stations, total] = await Promise.all([
    prisma.maritimeStation.findMany({
      take: 20,
      orderBy: { name: "asc" },
    }),
    prisma.maritimeStation.count(),
  ]);

  // Convert Prisma Decimal/DateTime to plain JS types for serialization
  const serializedStations = stations.map((s) => ({
    id: s.id,
    name: s.name,
    latitude: s.latitude ? Number(s.latitude) : 0,
    longitude: s.longitude ? Number(s.longitude) : 0,
    locality: s.locality,
    province: s.province,
    provinceName: s.provinceName,
    port: s.port,
    priceGasoleoA: s.priceGasoleoA ? Number(s.priceGasoleoA) : null,
    priceGasoleoB: s.priceGasoleoB ? Number(s.priceGasoleoB) : null,
    priceGasolina95E5: s.priceGasolina95E5 ? Number(s.priceGasolina95E5) : null,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Marítimo", href: "/maritimo" },
          { name: "Combustible", href: "/maritimo/combustible" },
        ]} />
      </div>
      <MaritimasClient initialData={initialData} />
    </>
  );
}
