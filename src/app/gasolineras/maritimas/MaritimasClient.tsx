"use client";

import { fetcher } from "@/lib/fetcher";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Anchor,
  Search,
  Filter,
  MapPin,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Info,
  TrendingDown,
  Ship,
  Fuel,
  AlertTriangle,
} from "lucide-react";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

/** Province code → coast/region group */
const COAST_REGIONS: Record<string, string> = {
  // Mediterráneo
  "08": "Mediterráneo", "17": "Mediterráneo", "43": "Mediterráneo",
  "03": "Mediterráneo", "12": "Mediterráneo", "46": "Mediterráneo",
  "30": "Mediterráneo", "04": "Mediterráneo", "18": "Mediterráneo", "29": "Mediterráneo",
  // Atlántico Sur
  "21": "Atlántico Sur", "11": "Atlántico Sur", "41": "Atlántico Sur",
  "35": "Atlántico Sur", "38": "Atlántico Sur",
  // Atlántico Norte
  "15": "Atlántico Norte", "27": "Atlántico Norte", "36": "Atlántico Norte",
  "33": "Atlántico Norte", "39": "Atlántico Norte", "48": "Atlántico Norte",
  "20": "Atlántico Norte",
  // Baleares
  "07": "Baleares",
  // Ciudades autónomas
  "51": "Ceuta y Melilla", "52": "Ceuta y Melilla",
};

const REGION_META: Record<
  string,
  { label: string; color: string; borderColor: string; icon: string; desc: string }
> = {
  "Mediterráneo": {
    label: "Mediterráneo",
    color: "bg-cyan-50 dark:bg-cyan-900/20",
    borderColor: "border-cyan-200",
    icon: "🌊",
    desc: "Cataluña, Valencia, Murcia, Andalucía oriental",
  },
  "Atlántico Sur": {
    label: "Atlántico Sur",
    color: "bg-tl-50 dark:bg-tl-900/20",
    borderColor: "border-tl-200 dark:border-tl-800",
    icon: "⚓",
    desc: "Andalucía occidental, Islas Canarias",
  },
  "Atlántico Norte": {
    label: "Atlántico Norte",
    color: "bg-indigo-50",
    borderColor: "border-indigo-200",
    icon: "🌬️",
    desc: "Galicia, Asturias, Cantabria, País Vasco",
  },
  Baleares: {
    label: "Baleares",
    color: "bg-teal-50 dark:bg-teal-900/20",
    borderColor: "border-teal-200",
    icon: "🏝️",
    desc: "Islas Baleares",
  },
  "Ceuta y Melilla": {
    label: "Ceuta y Melilla",
    color: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
    borderColor: "border-tl-amber-200 dark:border-tl-amber-800",
    icon: "🏛️",
    desc: "Ciudades autónomas (fiscalidad especial)",
  },
};

const FUEL_TYPES = [
  {
    name: "Gasóleo A",
    badge: "bg-tl-amber-100 text-tl-amber-800",
    desc: "Para motores diésel en embarcaciones de recreo y uso general. Es el combustible más utilizado en náutica por la mayoría de cruceros, veleros auxiliares y barcos de pesca artesanal.",
  },
  {
    name: "Gasóleo B",
    badge: "bg-cyan-100 text-cyan-800",
    desc: "Gasóleo bonificado para pesca profesional y usos agrícolas. Su tipo impositivo reducido lo hace más económico, pero su uso está limitado por ley a flotas pesqueras con autorización. Se tiñe de azul para distinción.",
  },
  {
    name: "Gasolina 95",
    badge: "bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200",
    desc: "Para motores fueraborda de gasolina, equipados en embarcaciones ligeras, neumáticas y pequeñas lanchas. También utilizado en motos de agua.",
  },
];

const FAQS = [
  {
    q: "¿Puedo repostar Gasóleo B en cualquier estación marítima?",
    a: "No. El Gasóleo B (bonificado) solo puede ser adquirido por profesionales del sector pesquero que dispongan de la correspondiente tarjeta de bonificación emitida por la Agencia Tributaria. Las embarcaciones de recreo deben usar Gasóleo A. El uso fraudulento de Gasóleo B puede acarrear sanciones superiores a 6.000 €.",
  },
  {
    q: "¿Por qué el combustible marítimo suele ser más caro que el terrestre?",
    a: "Las estaciones marítimas tienen costes logísticos superiores: instalaciones en puerto, control de derrames, seguros específicos y menor volumen de ventas. Además, muchas aplican márgenes más altos por la cautividad del cliente en el amarre. Es recomendable comparar precios antes de zarpar.",
  },
  {
    q: "¿El combustible marítimo lleva IVA?",
    a: "El Gasóleo A en embarcaciones de recreo lleva IVA al 21 %. Sin embargo, el combustible adquirido para navegación comercial intracomunitaria puede estar exento de impuestos especiales. En Canarias, Ceuta y Melilla se aplican tipos impositivos reducidos (IGIC 7 % o 0 %), lo que produce precios notablemente más bajos.",
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MaritimeStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  port: string | null;
  locality: string | null;
  provinceName: string | null;
  province: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  priceGasoleoB: number | null;
  is24h: boolean;
  schedule: string | null;
}

interface ApiResponse {
  success: boolean;
  data: MaritimeStation[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function formatPrice(price: number | null) {
  if (price == null) return "N/D";
  return `${price.toFixed(3)} €`;
}

function regionForProvince(code: string | null): string {
  if (!code) return "Otras";
  return COAST_REGIONS[code.padStart(2, "0")] ?? "Otras";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FuelTypesSection() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Fuel className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
        Tipos de combustible en puertos deportivos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FUEL_TYPES.map((ft) => (
          <div key={ft.name} className="rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-4">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ft.badge} mb-2 inline-block`}>
              {ft.name}
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{ft.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaxInfoBox() {
  return (
    <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg border border-tl-amber-200 dark:border-tl-amber-800 p-5 mb-8 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-tl-amber-900 mb-1">Fiscalidad especial del combustible náutico</h3>
        <p className="text-sm text-tl-amber-800 leading-relaxed">
          El combustible adquirido en <strong>Canarias</strong> (IGIC 7 %), <strong>Ceuta</strong> y{" "}
          <strong>Melilla</strong> (IPSI 0,5 %) tiene una carga fiscal significativamente menor.
          La navegación comercial y de transporte en aguas comunitarias puede acceder a{" "}
          <strong>exenciones de impuestos especiales</strong> sobre hidrocarburos (art. 51.2 Ley 38/1992).
          Las embarcaciones de recreo tributan siempre con IVA al 21 % y sin bonificaciones.
        </p>
      </div>
    </div>
  );
}

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-tl-600 dark:text-tl-400" />
        Preguntas frecuentes sobre combustible marítimo
      </h2>
      <div className="space-y-3">
        {FAQS.map((faq, idx) => (
          <div key={idx} className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
            >
              {faq.q}
              <ChevronDown
                className={`w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${openIdx === idx ? "rotate-180" : ""}`}
              />
            </button>
            {openIdx === idx && (
              <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MaritimasClientProps {
  initialData: {
    success: boolean;
    data: MaritimeStation[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MaritimasClient({ initialData }: MaritimasClientProps) {
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", "100");
    if (province) params.set("province", province);
    return `/api/maritime-stations?${params.toString()}`;
  }, [page, province]);

  const { data, isLoading, error } = useSWR<ApiResponse>(buildUrl(), fetcher, {
    fallbackData: initialData,
  });

  useEffect(() => {
    setPage(1);
  }, [province]);

  const formatP = formatPrice;

  // Filter + group stations
  const filtered = (data?.data ?? []).filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !s.name.toLowerCase().includes(q) &&
        !s.port?.toLowerCase().includes(q) &&
        !s.locality?.toLowerCase().includes(q)
      )
        return false;
    }
    if (activeRegion && regionForProvince(s.province) !== activeRegion) return false;
    return true;
  });

  // Group by region
  const byRegion: Record<string, MaritimeStation[]> = {};
  for (const s of filtered) {
    const region = regionForProvince(s.province);
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(s);
  }

  // Stats
  const allStations = data?.data ?? [];
  const withDiesel = allStations.filter((s) => s.priceGasoleoA != null);
  const avgDiesel =
    withDiesel.length > 0
      ? withDiesel.reduce((sum, s) => sum + s.priceGasoleoA!, 0) / withDiesel.length
      : null;
  const withGas95 = allStations.filter((s) => s.priceGasolina95E5 != null);
  const avgGas95 =
    withGas95.length > 0
      ? withGas95.reduce((sum, s) => sum + s.priceGasolina95E5!, 0) / withGas95.length
      : null;

  // Top 5 cheapest by diesel
  const cheapestDiesel = [...withDiesel]
    .sort((a, b) => a.priceGasoleoA! - b.priceGasoleoA!)
    .slice(0, 5);

  const regionOrder = ["Mediterráneo", "Atlántico Sur", "Atlántico Norte", "Baleares", "Ceuta y Melilla", "Otras"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { name: "Inicio", href: "/" },
        { name: "Gasolineras", href: "/gasolineras" },
        { name: "Marítimas", href: "/gasolineras/maritimas" },
      ]} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 mb-3">
          <Anchor className="w-8 h-8 text-tl-600 dark:text-tl-400" />
          Estaciones Marítimas de Combustible en España
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
          Directorio completo de puntos de suministro de combustible en puertos deportivos, pesqueros
          y comerciales de España. Precios de Gasóleo A, Gasóleo B (pesca) y Gasolina 95
          actualizados desde el Ministerio para la Transición Ecológica.
        </p>
      </div>

      {/* Who needs maritime fuel */}
      <div className="bg-tl-50 dark:bg-tl-900/20 rounded-lg border border-tl-200 dark:border-tl-800 p-6 mb-8">
        <div className="flex items-start gap-4">
          <Ship className="w-8 h-8 text-tl-600 dark:text-tl-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-tl-900 mb-2">
              ¿Quién necesita combustible en puerto?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-tl-800 dark:text-tl-200">
              <div>
                <strong className="block mb-1">Náutica de recreo</strong>
                Veleros, cruceros, motos de agua y lanchas deportivas que requieren Gasóleo A o Gasolina 95 según el motor.
              </div>
              <div>
                <strong className="block mb-1">Flota pesquera artesanal</strong>
                Embarcaciones de pesca profesional con acceso a Gasóleo B bonificado mediante tarjeta de la Agencia Tributaria.
              </div>
              <div>
                <strong className="block mb-1">Transporte comercial</strong>
                Ferrys, cargueros y embarcaciones de servicio que pueden acogerse a exenciones de impuestos especiales en navegación intracomunitaria.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.pagination.total.toLocaleString("es-ES")}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">estaciones en puertos</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-tl-amber-700 dark:text-tl-amber-300">
              {avgDiesel != null ? formatP(avgDiesel) : "—"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">precio medio Gasóleo A</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-tl-700 dark:text-tl-300">
              {avgGas95 != null ? formatP(avgGas95) : "—"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">precio medio Gasolina 95</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {cheapestDiesel[0]?.priceGasoleoA != null
                ? formatP(cheapestDiesel[0].priceGasoleoA)
                : "—"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              mín. Gasóleo A
              {cheapestDiesel[0]?.port ? ` · ${cheapestDiesel[0].port}` : ""}
            </div>
          </div>
        </div>
      )}

      {/* Cheapest 5 */}
      {cheapestDiesel.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
            Las 5 estaciones marítimas con Gasóleo A más barato
          </h2>
          <div className="space-y-2">
            {cheapestDiesel.map((s, idx) => (
              <Link
                key={s.id}
                href={`/gasolineras/maritimas/${s.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:bg-gray-900 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-1">{s.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {s.port ? `Puerto: ${s.port} · ` : ""}
                    {s.locality}{s.provinceName ? `, ${s.provinceName}` : ""}
                  </div>
                </div>
                <div className="text-lg font-bold text-green-700 dark:text-green-400 flex-shrink-0">
                  {formatP(s.priceGasoleoA)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Fuel type explainer */}
      <FuelTypesSection />

      {/* Tax info */}
      <TaxInfoBox />

      {/* Region filter pills */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveRegion(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeRegion === null
                ? "bg-tl-600 text-white"
                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-950"
            }`}
          >
            Todas las costas
          </button>
          {Object.entries(REGION_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setActiveRegion(activeRegion === key ? null : key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeRegion === key
                  ? "bg-tl-600 text-white"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-950"
              }`}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, puerto, localidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-tl-500 dark:ring-tl-400 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-950"
          >
            <Filter className="w-5 h-5" />
            Filtrar por provincia
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provincia</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-tl-500 dark:ring-tl-400"
              >
                <option value="">Todas las provincias</option>
                {Object.entries(PROVINCE_NAMES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {province && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1 px-2 py-1 bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 rounded-full text-sm">
              {PROVINCE_NAMES[province]}
              <button onClick={() => setProvince("")} className="hover:text-tl-900">
                <X className="w-4 h-4" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tl-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600 dark:text-red-400">
          Error al cargar las estaciones marítimas. Inténtalo de nuevo.
        </div>
      ) : (
        <>
          {/* Grouped by region */}
          {(search || activeRegion ? [null] : regionOrder).map((regionKey) => {
            const regionsToShow =
              search || activeRegion
                ? Object.keys(byRegion)
                : regionKey
                ? [regionKey]
                : regionOrder;

            if (search || activeRegion) {
              // Flat list when searching or filtering by region
              return (
                <div key="flat">
                  {Object.keys(byRegion).length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No se encontraron estaciones marítimas con ese criterio.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {filtered.map((station) => (
                        <StationCard key={station.id} station={station} formatP={formatP} />
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Grouped view
            const region = regionKey!;
            const regionStations = byRegion[region];
            if (!regionStations || regionStations.length === 0) return null;
            const meta = REGION_META[region];

            return (
              <div key={region} className="mb-10">
                <div className={`rounded-lg ${meta?.color ?? "bg-gray-50 dark:bg-gray-950"} border ${meta?.borderColor ?? "border-gray-200 dark:border-gray-800"} px-5 py-3 mb-4 flex items-center justify-between`}>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {meta?.icon} {meta?.label ?? region}
                      <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                        ({regionStations.length} estaciones)
                      </span>
                    </h2>
                    {meta?.desc && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{meta.desc}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regionStations.map((station) => (
                    <StationCard key={station.id} station={station} formatP={formatP} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Pagination (only when no active filter on small sets) */}
          {!search && !activeRegion && data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-gray-950"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                Página {page} de {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-gray-950"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* FAQ */}
      <div className="mt-8">
        <FAQSection />
      </div>

      {/* Related links */}
      <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-8">
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">También te puede interesar</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { href: "/gasolineras", label: "Gasolineras terrestres" },
            { href: "/gasolineras/cerca", label: "Gasolineras cerca de mí" },
            { href: "/gasolineras/baratas", label: "Gasolineras baratas por ciudad" },
            { href: "/gasolineras/mapa", label: "Mapa de gasolineras" },
            { href: "/precio-gasolina-hoy", label: "Precio gasolina hoy" },
            { href: "/precio-diesel-hoy", label: "Precio diésel hoy" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-tl-300 hover:shadow-sm transition-all group text-sm"
            >
              <Anchor className="w-4 h-4 text-tl-500 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 group-hover:text-tl-700 dark:text-tl-300 transition-colors line-clamp-1">
                {link.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Station card (extracted to avoid anonymous components in list)
// ---------------------------------------------------------------------------

function StationCard({
  station,
  formatP,
}: {
  station: MaritimeStation;
  formatP: (p: number | null) => string;
}) {
  return (
    <Link
      href={`/gasolineras/maritimas/${station.id}`}
      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{station.name}</h3>
          {station.port && (
            <p className="text-sm text-tl-600 dark:text-tl-400 font-medium truncate">Puerto: {station.port}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
            {station.locality}
            {station.provinceName ? `, ${station.provinceName}` : ""}
          </p>
        </div>
        {station.is24h && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 text-xs rounded-full ml-2 flex-shrink-0">
            <Clock className="w-3 h-3" />
            24 h
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded p-2">
          <div className="text-xs text-tl-amber-600 dark:text-tl-amber-400">Gasóleo A</div>
          <div className="font-bold text-tl-amber-700 dark:text-tl-amber-300">{formatP(station.priceGasoleoA)}</div>
        </div>
        <div className="bg-tl-50 dark:bg-tl-900/20 rounded p-2">
          <div className="text-xs text-tl-600 dark:text-tl-400">Gasolina 95</div>
          <div className="font-bold text-tl-700 dark:text-tl-300">{formatP(station.priceGasolina95E5)}</div>
        </div>
      </div>

      {station.priceGasoleoB != null && (
        <div className="mt-2 bg-cyan-50 dark:bg-cyan-900/20 rounded p-2">
          <div className="text-xs text-cyan-600">Gasóleo B (pesca)</div>
          <div className="font-bold text-cyan-700">{formatP(station.priceGasoleoB)}</div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
        <MapPin className="w-3 h-3" />
        {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
      </div>
    </Link>
  );
}
