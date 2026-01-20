import { Metadata } from "next";
import Link from "next/link";
import { MapPin, AlertTriangle, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Provincias",
  description: "Estado del tráfico en las 52 provincias españolas. Consulta incidencias, balizas V16 y estadísticas por provincia.",
};

// Spanish provinces with INE codes and autonomous communities
const provinces = [
  { code: "01", name: "Álava", community: "País Vasco" },
  { code: "02", name: "Albacete", community: "Castilla-La Mancha" },
  { code: "03", name: "Alicante", community: "Comunidad Valenciana" },
  { code: "04", name: "Almería", community: "Andalucía" },
  { code: "05", name: "Ávila", community: "Castilla y León" },
  { code: "06", name: "Badajoz", community: "Extremadura" },
  { code: "07", name: "Baleares", community: "Islas Baleares" },
  { code: "08", name: "Barcelona", community: "Cataluña" },
  { code: "09", name: "Burgos", community: "Castilla y León" },
  { code: "10", name: "Cáceres", community: "Extremadura" },
  { code: "11", name: "Cádiz", community: "Andalucía" },
  { code: "12", name: "Castellón", community: "Comunidad Valenciana" },
  { code: "13", name: "Ciudad Real", community: "Castilla-La Mancha" },
  { code: "14", name: "Córdoba", community: "Andalucía" },
  { code: "15", name: "A Coruña", community: "Galicia" },
  { code: "16", name: "Cuenca", community: "Castilla-La Mancha" },
  { code: "17", name: "Girona", community: "Cataluña" },
  { code: "18", name: "Granada", community: "Andalucía" },
  { code: "19", name: "Guadalajara", community: "Castilla-La Mancha" },
  { code: "20", name: "Gipuzkoa", community: "País Vasco" },
  { code: "21", name: "Huelva", community: "Andalucía" },
  { code: "22", name: "Huesca", community: "Aragón" },
  { code: "23", name: "Jaén", community: "Andalucía" },
  { code: "24", name: "León", community: "Castilla y León" },
  { code: "25", name: "Lleida", community: "Cataluña" },
  { code: "26", name: "La Rioja", community: "La Rioja" },
  { code: "27", name: "Lugo", community: "Galicia" },
  { code: "28", name: "Madrid", community: "Comunidad de Madrid" },
  { code: "29", name: "Málaga", community: "Andalucía" },
  { code: "30", name: "Murcia", community: "Región de Murcia" },
  { code: "31", name: "Navarra", community: "Navarra" },
  { code: "32", name: "Ourense", community: "Galicia" },
  { code: "33", name: "Asturias", community: "Principado de Asturias" },
  { code: "34", name: "Palencia", community: "Castilla y León" },
  { code: "35", name: "Las Palmas", community: "Canarias" },
  { code: "36", name: "Pontevedra", community: "Galicia" },
  { code: "37", name: "Salamanca", community: "Castilla y León" },
  { code: "38", name: "Santa Cruz de Tenerife", community: "Canarias" },
  { code: "39", name: "Cantabria", community: "Cantabria" },
  { code: "40", name: "Segovia", community: "Castilla y León" },
  { code: "41", name: "Sevilla", community: "Andalucía" },
  { code: "42", name: "Soria", community: "Castilla y León" },
  { code: "43", name: "Tarragona", community: "Cataluña" },
  { code: "44", name: "Teruel", community: "Aragón" },
  { code: "45", name: "Toledo", community: "Castilla-La Mancha" },
  { code: "46", name: "Valencia", community: "Comunidad Valenciana" },
  { code: "47", name: "Valladolid", community: "Castilla y León" },
  { code: "48", name: "Bizkaia", community: "País Vasco" },
  { code: "49", name: "Zamora", community: "Castilla y León" },
  { code: "50", name: "Zaragoza", community: "Aragón" },
  { code: "51", name: "Ceuta", community: "Ceuta" },
  { code: "52", name: "Melilla", community: "Melilla" },
];

// Group provinces by autonomous community
const groupedByAutonomia = provinces.reduce((acc, province) => {
  if (!acc[province.community]) {
    acc[province.community] = [];
  }
  acc[province.community].push(province);
  return acc;
}, {} as Record<string, typeof provinces>);

export default function ProvinciasPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Provincias de España</h1>
          <p className="mt-2 text-gray-600">
            Consulta el estado del tráfico en las 52 provincias españolas. Datos actualizados cada minuto desde la DGT.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-3xl font-bold text-gray-900">52</p>
            <p className="text-sm text-gray-500">Provincias</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-3xl font-bold text-gray-900">17</p>
            <p className="text-sm text-gray-500">Comunidades Autónomas</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-3xl font-bold text-gray-900">2</p>
            <p className="text-sm text-gray-500">Ciudades Autónomas</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-3xl font-bold text-red-600">-</p>
            <p className="text-sm text-gray-500">Incidencias Activas</p>
          </div>
        </div>

        {/* Province List by Autonomía */}
        <div className="space-y-8">
          {Object.entries(groupedByAutonomia)
            .sort(([a], [b]) => a.localeCompare(b, "es"))
            .map(([community, communityProvinces]) => (
              <section key={community}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-600" />
                  {community}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {communityProvinces.map((province) => (
                    <Link
                      key={province.code}
                      href={`/provincias/${province.code}`}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-red-200 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                            {province.name}
                          </h3>
                          <p className="text-sm text-gray-500">Código INE: {province.code}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </main>
    </div>
  );
}
