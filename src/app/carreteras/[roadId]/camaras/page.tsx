import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Camera, ArrowLeft, MapPin, ExternalLink } from "lucide-react";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ roadId: string }>;
}

const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roadId } = await params;
  const normalizedId = decodeURIComponent(roadId).toUpperCase();

  const road = await prisma.road.findFirst({
    where: { id: { equals: normalizedId, mode: "insensitive" } },
  });

  if (!road) {
    return { title: "Carretera no encontrada" };
  }

  const cameraCount = await prisma.camera.count({
    where: { roadNumber: road.id, isActive: true },
  });

  const title = `Cámaras de tráfico en ${road.id}${road.name ? ` (${road.name})` : ""} | ${cameraCount} cámaras`;
  const description = `${cameraCount} cámaras de vigilancia de tráfico en la ${road.id}. Ver estado del tráfico en tiempo real, imágenes actualizadas y condiciones de circulación.`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export async function generateStaticParams() {
  try {
    const roads = await prisma.road.findMany({
      where: { type: { in: ["AUTOPISTA", "AUTOVIA", "NACIONAL"] } },
      select: { id: true },
    });
    return roads.map((road) => ({ roadId: road.id }));
  } catch (error) {
    console.error("Failed to generate static params for camaras:", error);
    return [];
  }
}

export default async function RoadCamerasPage({ params }: PageProps) {
  const { roadId } = await params;
  const normalizedId = decodeURIComponent(roadId).toUpperCase();

  const road = await prisma.road.findFirst({
    where: { id: { equals: normalizedId, mode: "insensitive" } },
  });

  if (!road) {
    notFound();
  }

  const cameras = await prisma.camera.findMany({
    where: { roadNumber: road.id, isActive: true },
    orderBy: { kmPoint: "asc" },
  });

  // Group cameras by province
  const camerasByProvince = cameras.reduce((acc, camera) => {
    const prov = camera.province || "other";
    if (!acc[prov]) acc[prov] = [];
    acc[prov].push(camera);
    return acc;
  }, {} as Record<string, typeof cameras>);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/carreteras" className="hover:text-gray-700">Carreteras</Link>
          <span className="mx-2">/</span>
          <Link href={`/carreteras/${road.id}`} className="hover:text-gray-700">{road.id}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Cámaras</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Camera className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Cámaras de tráfico en {road.id}
                  </h1>
                  {road.name && <p className="text-gray-600">{road.name}</p>}
                </div>
              </div>
              <p className="text-gray-600 mt-2">
                {cameras.length} cámaras de vigilancia activas en esta carretera
              </p>
            </div>
            <Link
              href={`/carreteras/${road.id}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{cameras.length}</div>
            <div className="text-sm text-gray-600">Cámaras activas</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{Object.keys(camerasByProvince).length}</div>
            <div className="text-sm text-gray-600">Provincias</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">
              {cameras.filter(c => c.lastUpdated && new Date(c.lastUpdated) > new Date(Date.now() - 3600000)).length}
            </div>
            <div className="text-sm text-gray-600">Actualizadas (1h)</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">
              {cameras.filter(c => c.thumbnailUrl || c.feedUrl).length}
            </div>
            <div className="text-sm text-gray-600">Con imagen</div>
          </div>
        </div>

        {/* Cameras by Province */}
        {Object.entries(camerasByProvince).map(([province, provCameras]) => (
          <div key={province} className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">
                {PROVINCE_NAMES[province] || province}
              </h2>
              <span className="text-gray-500 font-normal">({provCameras.length} cámaras)</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {provCameras.map((camera) => (
                  <div key={camera.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{camera.name || `Cámara ${camera.id}`}</h3>
                        <p className="text-sm text-gray-500">
                          {camera.kmPoint ? `km ${Number(camera.kmPoint).toFixed(1)}` : ""}
                          {camera.provinceName && ` · ${camera.provinceName}`}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        camera.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {camera.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    {(camera.feedUrl || camera.thumbnailUrl) && (
                      <a
                        href={camera.feedUrl || camera.thumbnailUrl || ""}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        Ver imagen <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {camera.latitude && camera.longitude && (
                      <p className="text-xs text-gray-400 mt-1">
                        {Number(camera.latitude).toFixed(4)}, {Number(camera.longitude).toFixed(4)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {cameras.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sin cámaras disponibles</h2>
            <p className="text-gray-600">
              No hay cámaras de tráfico activas registradas en la {road.id}.
            </p>
          </div>
        )}

        {/* SEO Content */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Cámaras de vigilancia de tráfico en la {road.id}
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              Las cámaras de tráfico de la {road.id}{road.name ? ` (${road.name})` : ""} permiten
              visualizar el estado del tráfico en tiempo real. Estas cámaras son gestionadas por
              la Dirección General de Tráfico (DGT) y proporcionan información actualizada sobre
              las condiciones de circulación.
            </p>
            <h3>Uso de las cámaras de tráfico</h3>
            <ul>
              <li><strong>Planificación de viajes:</strong> Consulta el estado del tráfico antes de salir</li>
              <li><strong>Condiciones meteorológicas:</strong> Visualiza si hay lluvia, niebla o nieve</li>
              <li><strong>Obras y retenciones:</strong> Identifica zonas con tráfico lento</li>
              <li><strong>Accidentes:</strong> Información inmediata sobre incidencias</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
