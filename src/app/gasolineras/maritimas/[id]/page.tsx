import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Anchor, MapPin, Clock, Navigation, ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const station = await prisma.maritimeStation.findUnique({ where: { id } });

  if (!station) {
    return { title: "Estación marítima no encontrada" };
  }

  return {
    title: `${station.name} - Estación Marítima | Tráfico España`,
    description: `Precios de combustible en ${station.name}${station.port ? `, Puerto de ${station.port}` : ""}. Gasóleo A: ${station.priceGasoleoA?.toFixed(3) || "N/D"}€`,
  };
}

export default async function MaritimeStationDetailPage({ params }: Props) {
  const { id } = await params;

  const station = await prisma.maritimeStation.findUnique({ where: { id } });

  if (!station) {
    notFound();
  }

  const formatPrice = (price: unknown) => {
    if (price == null) return "N/D";
    const num = typeof price === "object" && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
    return `${num.toFixed(3)}€`;
  };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/gasolineras" className="hover:text-gray-700">Gasolineras</Link>
        <span>/</span>
        <Link href="/gasolineras/maritimas" className="hover:text-gray-700">Marítimas</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[200px]">{station.name}</span>
      </div>

      {/* Back button */}
      <Link
        href="/gasolineras/maritimas"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Anchor className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{station.name}</h1>
                {station.port && (
                  <p className="text-lg text-blue-600 font-medium">Puerto de {station.port}</p>
                )}
                <p className="text-gray-600">
                  {station.locality}
                  {station.provinceName && `, ${station.provinceName}`}
                </p>
              </div>
              {station.is24h && (
                <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  24h
                </span>
              )}
            </div>

            {station.schedule && !station.is24h && (
              <p className="mt-2 text-sm text-gray-500">
                <Clock className="w-4 h-4 inline mr-1" />
                {station.schedule}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Cómo llegar
              </a>
              <Link
                href={`/gasolineras/mapa?lat=${station.latitude}&lng=${station.longitude}&zoom=15&layer=maritime`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Ver en mapa
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Prices */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Precios Actuales</h2>
        <div className="grid grid-cols-2 gap-4">
          {station.priceGasoleoA && (
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-sm text-amber-600 mb-1">Gasóleo A</div>
              <div className="text-3xl font-bold text-amber-700">{formatPrice(station.priceGasoleoA)}</div>
            </div>
          )}
          {station.priceGasolina95E5 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">Gasolina 95</div>
              <div className="text-3xl font-bold text-blue-700">{formatPrice(station.priceGasolina95E5)}</div>
            </div>
          )}
          {station.priceGasoleoB && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Gasóleo B</div>
              <div className="text-2xl font-bold text-gray-700">{formatPrice(station.priceGasoleoB)}</div>
            </div>
          )}
          {station.priceGasolina98E5 && (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 mb-1">Gasolina 98</div>
              <div className="text-2xl font-bold text-purple-700">{formatPrice(station.priceGasolina98E5)}</div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Última actualización: {new Date(station.lastPriceUpdate).toLocaleString("es-ES")}
        </p>
      </div>

      {/* Location Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {station.port && (
            <div>
              <span className="text-gray-500">Puerto:</span>
              <p className="font-medium">{station.port}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Localidad:</span>
            <p className="font-medium">{station.locality || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500">Provincia:</span>
            <p className="font-medium">{station.provinceName || "No disponible"}</p>
          </div>
          <div>
            <span className="text-gray-500">Coordenadas:</span>
            <p className="font-medium font-mono text-xs">
              {Number(station.latitude).toFixed(6)}, {Number(station.longitude).toFixed(6)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
