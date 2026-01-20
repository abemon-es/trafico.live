import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, AlertTriangle, MapPin, Calendar, TrendingDown, TrendingUp } from "lucide-react";

// Province data
const provinces: Record<string, { name: string; community: string }> = {
  "01": { name: "Álava", community: "País Vasco" },
  "02": { name: "Albacete", community: "Castilla-La Mancha" },
  "03": { name: "Alicante", community: "Comunidad Valenciana" },
  "04": { name: "Almería", community: "Andalucía" },
  "05": { name: "Ávila", community: "Castilla y León" },
  "06": { name: "Badajoz", community: "Extremadura" },
  "07": { name: "Baleares", community: "Islas Baleares" },
  "08": { name: "Barcelona", community: "Cataluña" },
  "09": { name: "Burgos", community: "Castilla y León" },
  "10": { name: "Cáceres", community: "Extremadura" },
  "11": { name: "Cádiz", community: "Andalucía" },
  "12": { name: "Castellón", community: "Comunidad Valenciana" },
  "13": { name: "Ciudad Real", community: "Castilla-La Mancha" },
  "14": { name: "Córdoba", community: "Andalucía" },
  "15": { name: "A Coruña", community: "Galicia" },
  "16": { name: "Cuenca", community: "Castilla-La Mancha" },
  "17": { name: "Girona", community: "Cataluña" },
  "18": { name: "Granada", community: "Andalucía" },
  "19": { name: "Guadalajara", community: "Castilla-La Mancha" },
  "20": { name: "Gipuzkoa", community: "País Vasco" },
  "21": { name: "Huelva", community: "Andalucía" },
  "22": { name: "Huesca", community: "Aragón" },
  "23": { name: "Jaén", community: "Andalucía" },
  "24": { name: "León", community: "Castilla y León" },
  "25": { name: "Lleida", community: "Cataluña" },
  "26": { name: "La Rioja", community: "La Rioja" },
  "27": { name: "Lugo", community: "Galicia" },
  "28": { name: "Madrid", community: "Comunidad de Madrid" },
  "29": { name: "Málaga", community: "Andalucía" },
  "30": { name: "Murcia", community: "Región de Murcia" },
  "31": { name: "Navarra", community: "Navarra" },
  "32": { name: "Ourense", community: "Galicia" },
  "33": { name: "Asturias", community: "Principado de Asturias" },
  "34": { name: "Palencia", community: "Castilla y León" },
  "35": { name: "Las Palmas", community: "Canarias" },
  "36": { name: "Pontevedra", community: "Galicia" },
  "37": { name: "Salamanca", community: "Castilla y León" },
  "38": { name: "Santa Cruz de Tenerife", community: "Canarias" },
  "39": { name: "Cantabria", community: "Cantabria" },
  "40": { name: "Segovia", community: "Castilla y León" },
  "41": { name: "Sevilla", community: "Andalucía" },
  "42": { name: "Soria", community: "Castilla y León" },
  "43": { name: "Tarragona", community: "Cataluña" },
  "44": { name: "Teruel", community: "Aragón" },
  "45": { name: "Toledo", community: "Castilla-La Mancha" },
  "46": { name: "Valencia", community: "Comunidad Valenciana" },
  "47": { name: "Valladolid", community: "Castilla y León" },
  "48": { name: "Bizkaia", community: "País Vasco" },
  "49": { name: "Zamora", community: "Castilla y León" },
  "50": { name: "Zaragoza", community: "Aragón" },
  "51": { name: "Ceuta", community: "Ceuta" },
  "52": { name: "Melilla", community: "Melilla" },
};

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const province = provinces[code];

  if (!province) {
    return { title: "Provincia no encontrada" };
  }

  return {
    title: `Tráfico en ${province.name}`,
    description: `Estado del tráfico en ${province.name}, ${province.community}. Incidencias, balizas V16 y estadísticas de accidentes actualizadas en tiempo real.`,
  };
}

export async function generateStaticParams() {
  return Object.keys(provinces).map((code) => ({ code }));
}

export default async function ProvinciaDetailPage({ params }: Props) {
  const { code } = await params;
  const province = provinces[code];

  if (!province) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/provincias"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Todas las provincias
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
            <MapPin className="w-4 h-4" />
            {province.community}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{province.name}</h1>
          <p className="mt-2 text-gray-600">
            Estado del tráfico y estadísticas de siniestralidad vial en {province.name}.
          </p>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500">V16 Activas</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500">Incidencias</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500">Accidentes (2024)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500">Variación anual</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Active Incidents */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Incidencias activas en {province.name}
              </h2>
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Cargando incidencias...</p>
                <p className="text-sm mt-2">Los datos de incidencias específicas por provincia estarán disponibles próximamente.</p>
              </div>
            </div>

            {/* Historical Data */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Estadísticas históricas
              </h2>
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Datos históricos próximamente</p>
                <p className="text-sm mt-2">Importaremos datos de DGT en Cifras (2015-2024) para mostrar tendencias.</p>
              </div>
            </div>
          </div>

          {/* Right Column - Info */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Información
              </h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-gray-500">Código INE</dt>
                  <dd className="text-gray-900 font-medium">{code}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Comunidad Autónoma</dt>
                  <dd className="text-gray-900 font-medium">{province.community}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Fuente de datos</dt>
                  <dd className="text-gray-900">DGT NAP (DATEX II v3.6)</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Actualización</dt>
                  <dd className="text-gray-900">Cada 60 segundos</dd>
                </div>
              </dl>
            </div>

            {/* Main Roads */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Carreteras principales
              </h2>
              <p className="text-sm text-gray-500">
                Información sobre las carreteras principales que atraviesan {province.name} estará disponible próximamente.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
