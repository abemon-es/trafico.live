import { prisma } from "@/lib/db";
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

  return <TerrestresClient initialData={initialData} />;
}
