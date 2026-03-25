import { Metadata } from "next";
import prisma from "@/lib/db";
import { DashboardClient } from "./DashboardClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: {
    canonical: BASE_URL,
  },
};

async function getHomeStats() {
  try {
    const [incidentCount, cameraCount, radarCount, stationCount, v16Count] =
      await Promise.all([
        prisma.trafficIncident.count({ where: { isActive: true } }),
        prisma.camera.count(),
        prisma.radar.count(),
        prisma.gasStation.count(),
        prisma.v16BeaconEvent.count({ where: { isActive: true } }),
      ]);
    return { incidentCount, cameraCount, radarCount, stationCount, v16Count };
  } catch {
    return { incidentCount: 0, cameraCount: 0, radarCount: 0, stationCount: 0, v16Count: 0 };
  }
}

export default async function Dashboard() {
  const stats = await getHomeStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SSR Hero — visible to Google crawlers */}
      <section className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tráfico en Tiempo Real en España
          </h1>
          <p className="text-gray-600 mb-6">
            Monitorización del tráfico español con datos oficiales de la DGT.
            Incidencias activas, cámaras de tráfico, radares, precios de
            combustible y balizas V16 en un solo mapa.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium">
              {stats.incidentCount.toLocaleString("es-ES")} incidencias activas
            </span>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
              {stats.cameraCount.toLocaleString("es-ES")} cámaras de tráfico
            </span>
            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
              {stats.radarCount.toLocaleString("es-ES")} radares
            </span>
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
              {stats.stationCount.toLocaleString("es-ES")} gasolineras
            </span>
            {stats.v16Count > 0 && (
              <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-medium">
                {stats.v16Count.toLocaleString("es-ES")} balizas V16 activas
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Client-side interactive content */}
      <DashboardClient />
    </div>
  );
}
