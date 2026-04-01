import {
  Fuel,
  Radar,
  Camera,
  Calendar,
  Ban,
  AlertTriangle,
  Calculator,
  MapPin,
  Zap,
  BookOpen,
  Code,
  Building2,
  Route,
  AlertCircle,
  Map,
  Search,
  Anchor,
  Wind,
  ShieldAlert,
  Newspaper,
  Globe,
  Mountain,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SearchCategory =
  | "carretera"
  | "ciudad"
  | "provincia"
  | "herramienta"
  | "combustible"
  | "maritimo";

export interface SearchResult {
  title: string;
  subtitle?: string;
  href: string;
  category: SearchCategory;
  icon: LucideIcon;
}

// ─── Category metadata ───────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  SearchCategory,
  { label: string; badgeClass: string; icon: LucideIcon }
> = {
  herramienta: {
    label: "Herramientas",
    badgeClass: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    icon: AlertCircle,
  },
  combustible: {
    label: "Combustible",
    badgeClass: "bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-300",
    icon: Fuel,
  },
  maritimo: {
    label: "Marítimo",
    badgeClass: "bg-tl-sea-100 dark:bg-tl-sea-900/30 text-tl-sea-700 dark:text-tl-sea-300",
    icon: Anchor,
  },
  carretera: {
    label: "Carreteras",
    badgeClass: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
    icon: Route,
  },
  ciudad: {
    label: "Ciudades",
    badgeClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    icon: Building2,
  },
  provincia: {
    label: "Provincias",
    badgeClass: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
    icon: MapPin,
  },
};

export const CATEGORY_ORDER: SearchCategory[] = [
  "herramienta",
  "combustible",
  "maritimo",
  "carretera",
  "ciudad",
  "provincia",
];

// ─── Full search index ───────────────────────────────────────────────────────

export const SEARCH_INDEX: SearchResult[] = [
  // Combustible
  { title: "Precio Gasolina Hoy", subtitle: "Precios actualizados", href: "/precio-gasolina-hoy", category: "combustible", icon: Fuel },
  { title: "Precio Diésel Hoy", subtitle: "Precios actualizados", href: "/precio-diesel-hoy", category: "combustible", icon: Fuel },
  { title: "Mapa de Gasolineras", href: "/gasolineras/mapa", category: "combustible", icon: MapPin },
  { title: "Gasolineras Baratas", subtitle: "Mejores precios", href: "/gasolineras/baratas", category: "combustible", icon: Fuel },
  { title: "Gasolineras 24 Horas", href: "/gasolineras-24-horas", category: "combustible", icon: Fuel },
  { title: "Precios por Provincia", subtitle: "Comparar 52 provincias", href: "/gasolineras/precios", category: "combustible", icon: MapPin },
  { title: "Gasolineras por Marcas", subtitle: "Repsol, Cepsa, BP...", href: "/gasolineras/marcas", category: "combustible", icon: Fuel },
  { title: "Cargadores Eléctricos", subtitle: "Puntos de carga EV", href: "/carga-ev", category: "combustible", icon: Zap },
  { title: "Electrolineras", subtitle: "Carga rápida", href: "/electrolineras", category: "combustible", icon: Zap },
  { title: "Cuánto Cuesta Cargar", href: "/cuanto-cuesta-cargar", category: "combustible", icon: Calculator },
  { title: "Etiqueta Ambiental", href: "/etiqueta-ambiental", category: "combustible", icon: Fuel },

  // Marítimo
  { title: "Combustible Marítimo", subtitle: "Precios en puertos", href: "/maritimo/combustible", category: "maritimo", icon: Fuel },
  { title: "Puertos de España", subtitle: "Directorio", href: "/maritimo/puertos", category: "maritimo", icon: Anchor },
  { title: "Mapa Marítimo", href: "/maritimo/mapa", category: "maritimo", icon: Map },
  { title: "Meteorología Costera", subtitle: "AEMET", href: "/maritimo/meteorologia", category: "maritimo", icon: Wind },
  { title: "Seguridad Marítima", subtitle: "SASEMAR", href: "/maritimo/seguridad", category: "maritimo", icon: ShieldAlert },
  { title: "Noticias Marítimas", href: "/maritimo/noticias", category: "maritimo", icon: Newspaper },

  // Herramientas
  { title: "Radares DGT", subtitle: "737 radares fijos", href: "/radares", category: "herramienta", icon: Radar },
  { title: "Cámaras de Tráfico", subtitle: "1.917 cámaras", href: "/camaras", category: "herramienta", icon: Camera },
  { title: "Operaciones Especiales", href: "/operaciones", category: "herramienta", icon: Calendar },
  { title: "Restricciones", href: "/restricciones", category: "herramienta", icon: Ban },
  { title: "Puntos Negros", href: "/puntos-negros", category: "herramienta", icon: AlertCircle },
  { title: "Calculadora de Ruta", href: "/calculadora", category: "herramienta", icon: Calculator },
  { title: "Incidencias", subtitle: "En tiempo real", href: "/incidencias", category: "herramienta", icon: AlertTriangle },
  { title: "Mapa en Vivo", subtitle: "Tráfico en tiempo real", href: "/mapa", category: "herramienta", icon: Map },
  { title: "Atascos", subtitle: "Retenciones actuales", href: "/atascos", category: "herramienta", icon: AlertTriangle },
  { title: "Alertas Meteo", subtitle: "Avisos AEMET", href: "/alertas-meteo", category: "herramienta", icon: AlertTriangle },
  { title: "Cortes de Tráfico", href: "/cortes-trafico", category: "herramienta", icon: Ban },
  { title: "Mejor Hora para Viajar", href: "/mejor-hora", category: "herramienta", icon: Calendar },
  { title: "Zonas ZBE", subtitle: "Bajas emisiones", href: "/zbe", category: "herramienta", icon: Ban },
  { title: "Intensidad (IMD)", subtitle: "Tráfico por carretera", href: "/intensidad", category: "herramienta", icon: Route },
  { title: "Estaciones de Aforo", subtitle: "14.400+ puntos", href: "/estaciones-aforo", category: "herramienta", icon: Radar },
  { title: "Estadísticas", href: "/estadisticas", category: "herramienta", icon: AlertCircle },
  { title: "Histórico", href: "/historico", category: "herramienta", icon: Calendar },
  { title: "Noticias", href: "/noticias", category: "herramienta", icon: BookOpen },
  { title: "Informe Diario", href: "/informe-diario", category: "herramienta", icon: BookOpen },
  { title: "API Docs", href: "/api-docs", category: "herramienta", icon: Code },
  { title: "Ciclistas", href: "/ciclistas", category: "herramienta", icon: AlertCircle },

  // Portugal y Andorra
  { title: "Portugal", subtitle: "Combustible, alertas y tráfico", href: "/portugal", category: "herramienta", icon: Globe },
  { title: "Combustible Portugal", subtitle: "3.000+ estaciones DGEG", href: "/portugal/combustible", category: "combustible", icon: Globe },
  { title: "Andorra", subtitle: "Tráfico e incidencias", href: "/andorra", category: "herramienta", icon: Mountain },

  // Ciudades
  { title: "Madrid", href: "/ciudad/madrid", category: "ciudad", icon: Building2 },
  { title: "Barcelona", href: "/ciudad/barcelona", category: "ciudad", icon: Building2 },
  { title: "Valencia", href: "/ciudad/valencia", category: "ciudad", icon: Building2 },
  { title: "Sevilla", href: "/ciudad/sevilla", category: "ciudad", icon: Building2 },
  { title: "Zaragoza", href: "/ciudad/zaragoza", category: "ciudad", icon: Building2 },
  { title: "Málaga", href: "/ciudad/malaga", category: "ciudad", icon: Building2 },
  { title: "Murcia", href: "/ciudad/murcia", category: "ciudad", icon: Building2 },
  { title: "Bilbao", href: "/ciudad/bilbao", category: "ciudad", icon: Building2 },
  { title: "Alicante", href: "/ciudad/alicante", category: "ciudad", icon: Building2 },
  { title: "Granada", href: "/ciudad/granada", category: "ciudad", icon: Building2 },
  { title: "Valladolid", href: "/ciudad/valladolid", category: "ciudad", icon: Building2 },
  { title: "Palma de Mallorca", href: "/ciudad/palma", category: "ciudad", icon: Building2 },
  { title: "Las Palmas de Gran Canaria", href: "/ciudad/las-palmas", category: "ciudad", icon: Building2 },
  { title: "Córdoba", href: "/ciudad/cordoba", category: "ciudad", icon: Building2 },
  { title: "Vigo", href: "/ciudad/vigo", category: "ciudad", icon: Building2 },
  { title: "Gijón", href: "/ciudad/gijon", category: "ciudad", icon: Building2 },
  { title: "A Coruña", href: "/ciudad/a-coruna", category: "ciudad", icon: Building2 },
  { title: "San Sebastián", href: "/ciudad/san-sebastian", category: "ciudad", icon: Building2 },

  // Provincias (52)
  { title: "Álava", href: "/provincia/alava", category: "provincia", icon: MapPin },
  { title: "Albacete", href: "/provincia/albacete", category: "provincia", icon: MapPin },
  { title: "Alicante", href: "/provincia/alicante", category: "provincia", icon: MapPin },
  { title: "Almería", href: "/provincia/almeria", category: "provincia", icon: MapPin },
  { title: "Asturias", href: "/provincia/asturias", category: "provincia", icon: MapPin },
  { title: "Ávila", href: "/provincia/avila", category: "provincia", icon: MapPin },
  { title: "Badajoz", href: "/provincia/badajoz", category: "provincia", icon: MapPin },
  { title: "Baleares", href: "/provincia/baleares", category: "provincia", icon: MapPin },
  { title: "Barcelona", href: "/provincia/barcelona", category: "provincia", icon: MapPin },
  { title: "Burgos", href: "/provincia/burgos", category: "provincia", icon: MapPin },
  { title: "Cáceres", href: "/provincia/caceres", category: "provincia", icon: MapPin },
  { title: "Cádiz", href: "/provincia/cadiz", category: "provincia", icon: MapPin },
  { title: "Cantabria", href: "/provincia/cantabria", category: "provincia", icon: MapPin },
  { title: "Castellón", href: "/provincia/castellon", category: "provincia", icon: MapPin },
  { title: "Ciudad Real", href: "/provincia/ciudad-real", category: "provincia", icon: MapPin },
  { title: "Córdoba", href: "/provincia/cordoba", category: "provincia", icon: MapPin },
  { title: "Cuenca", href: "/provincia/cuenca", category: "provincia", icon: MapPin },
  { title: "Gerona", href: "/provincia/gerona", category: "provincia", icon: MapPin },
  { title: "Granada", href: "/provincia/granada", category: "provincia", icon: MapPin },
  { title: "Guadalajara", href: "/provincia/guadalajara", category: "provincia", icon: MapPin },
  { title: "Guipúzcoa", href: "/provincia/guipuzcoa", category: "provincia", icon: MapPin },
  { title: "Huelva", href: "/provincia/huelva", category: "provincia", icon: MapPin },
  { title: "Huesca", href: "/provincia/huesca", category: "provincia", icon: MapPin },
  { title: "Jaén", href: "/provincia/jaen", category: "provincia", icon: MapPin },
  { title: "La Rioja", href: "/provincia/la-rioja", category: "provincia", icon: MapPin },
  { title: "Las Palmas", href: "/provincia/las-palmas", category: "provincia", icon: MapPin },
  { title: "León", href: "/provincia/leon", category: "provincia", icon: MapPin },
  { title: "Lérida", href: "/provincia/lerida", category: "provincia", icon: MapPin },
  { title: "Lugo", href: "/provincia/lugo", category: "provincia", icon: MapPin },
  { title: "Madrid", href: "/provincia/madrid", category: "provincia", icon: MapPin },
  { title: "Málaga", href: "/provincia/malaga", category: "provincia", icon: MapPin },
  { title: "Melilla", href: "/provincia/melilla", category: "provincia", icon: MapPin },
  { title: "Murcia", href: "/provincia/murcia", category: "provincia", icon: MapPin },
  { title: "Navarra", href: "/provincia/navarra", category: "provincia", icon: MapPin },
  { title: "Orense", href: "/provincia/orense", category: "provincia", icon: MapPin },
  { title: "Palencia", href: "/provincia/palencia", category: "provincia", icon: MapPin },
  { title: "Pontevedra", href: "/provincia/pontevedra", category: "provincia", icon: MapPin },
  { title: "Salamanca", href: "/provincia/salamanca", category: "provincia", icon: MapPin },
  { title: "Santa Cruz de Tenerife", href: "/provincia/santa-cruz-de-tenerife", category: "provincia", icon: MapPin },
  { title: "Segovia", href: "/provincia/segovia", category: "provincia", icon: MapPin },
  { title: "Sevilla", href: "/provincia/sevilla", category: "provincia", icon: MapPin },
  { title: "Soria", href: "/provincia/soria", category: "provincia", icon: MapPin },
  { title: "Tarragona", href: "/provincia/tarragona", category: "provincia", icon: MapPin },
  { title: "Teruel", href: "/provincia/teruel", category: "provincia", icon: MapPin },
  { title: "Toledo", href: "/provincia/toledo", category: "provincia", icon: MapPin },
  { title: "Valencia", href: "/provincia/valencia", category: "provincia", icon: MapPin },
  { title: "Valladolid", href: "/provincia/valladolid", category: "provincia", icon: MapPin },
  { title: "Vizcaya", href: "/provincia/vizcaya", category: "provincia", icon: MapPin },
  { title: "Zamora", href: "/provincia/zamora", category: "provincia", icon: MapPin },
  { title: "Zaragoza", href: "/provincia/zaragoza", category: "provincia", icon: MapPin },
  { title: "Ceuta", href: "/provincia/ceuta", category: "provincia", icon: MapPin },

  // Carreteras — Autopistas (AP)
  { title: "AP-1 Autopista del Norte", href: "/carreteras/AP-1", category: "carretera", icon: Route },
  { title: "AP-2 Autopista del Nordeste", href: "/carreteras/AP-2", category: "carretera", icon: Route },
  { title: "AP-4 Autopista del Sur", href: "/carreteras/AP-4", category: "carretera", icon: Route },
  { title: "AP-6 Autopista de Villalba", href: "/carreteras/AP-6", category: "carretera", icon: Route },
  { title: "AP-7 Autopista del Mediterráneo", href: "/carreteras/AP-7", category: "carretera", icon: Route },
  { title: "AP-8 Autopista del Cantábrico", href: "/carreteras/AP-8", category: "carretera", icon: Route },
  { title: "AP-9 Autopista del Atlántico", href: "/carreteras/AP-9", category: "carretera", icon: Route },
  { title: "AP-15 Autopista de Navarra", href: "/carreteras/AP-15", category: "carretera", icon: Route },
  { title: "AP-36 Autopista de Ocaña", href: "/carreteras/AP-36", category: "carretera", icon: Route },
  { title: "AP-41 Autopista Madrid-Toledo", href: "/carreteras/AP-41", category: "carretera", icon: Route },
  { title: "AP-51 Autopista de Ávila", href: "/carreteras/AP-51", category: "carretera", icon: Route },
  { title: "AP-61 Autopista de Segovia", href: "/carreteras/AP-61", category: "carretera", icon: Route },
  { title: "AP-68 Autopista del Ebro", href: "/carreteras/AP-68", category: "carretera", icon: Route },
  { title: "AP-71 Autopista de León", href: "/carreteras/AP-71", category: "carretera", icon: Route },
  // Autovías (A)
  { title: "A-1 Autovía del Norte", href: "/carreteras/A-1", category: "carretera", icon: Route },
  { title: "A-2 Autovía del Nordeste", href: "/carreteras/A-2", category: "carretera", icon: Route },
  { title: "A-3 Autovía del Este", href: "/carreteras/A-3", category: "carretera", icon: Route },
  { title: "A-4 Autovía del Sur", href: "/carreteras/A-4", category: "carretera", icon: Route },
  { title: "A-5 Autovía del Suroeste", href: "/carreteras/A-5", category: "carretera", icon: Route },
  { title: "A-6 Autovía del Noroeste", href: "/carreteras/A-6", category: "carretera", icon: Route },
  { title: "A-7 Autovía del Mediterráneo", href: "/carreteras/A-7", category: "carretera", icon: Route },
  { title: "A-8 Autovía del Cantábrico", href: "/carreteras/A-8", category: "carretera", icon: Route },
  { title: "A-10 Autovía de los Viñedos", href: "/carreteras/A-10", category: "carretera", icon: Route },
  { title: "A-11 Autovía del Duero", href: "/carreteras/A-11", category: "carretera", icon: Route },
  { title: "A-12 Autovía del Camino", href: "/carreteras/A-12", category: "carretera", icon: Route },
  { title: "A-15 Autovía de Navarra", href: "/carreteras/A-15", category: "carretera", icon: Route },
  { title: "A-21 Autovía de los Pirineos", href: "/carreteras/A-21", category: "carretera", icon: Route },
  { title: "A-23 Autovía de Aragón", href: "/carreteras/A-23", category: "carretera", icon: Route },
  { title: "A-30 Autovía Murcia-Cartagena", href: "/carreteras/A-30", category: "carretera", icon: Route },
  { title: "A-31 Autovía de Alicante", href: "/carreteras/A-31", category: "carretera", icon: Route },
  { title: "A-40 Autovía de Castilla", href: "/carreteras/A-40", category: "carretera", icon: Route },
  { title: "A-42 Autovía de Toledo", href: "/carreteras/A-42", category: "carretera", icon: Route },
  { title: "A-44 Autovía de Sierra Nevada", href: "/carreteras/A-44", category: "carretera", icon: Route },
  { title: "A-45 Autovía de Málaga", href: "/carreteras/A-45", category: "carretera", icon: Route },
  { title: "A-49 Autovía del Quinto Centenario", href: "/carreteras/A-49", category: "carretera", icon: Route },
  { title: "A-52 Autovía de las Rías Bajas", href: "/carreteras/A-52", category: "carretera", icon: Route },
  { title: "A-62 Autovía de Castilla", href: "/carreteras/A-62", category: "carretera", icon: Route },
  { title: "A-66 Autovía de la Plata", href: "/carreteras/A-66", category: "carretera", icon: Route },
  { title: "A-67 Autovía de la Meseta", href: "/carreteras/A-67", category: "carretera", icon: Route },
  { title: "A-92 Autovía de Andalucía", href: "/carreteras/A-92", category: "carretera", icon: Route },
  // Nacionales (N)
  { title: "N-I Carretera de Irún", href: "/carreteras/N-I", category: "carretera", icon: Route },
  { title: "N-II Carretera de Francia", href: "/carreteras/N-II", category: "carretera", icon: Route },
  { title: "N-III Carretera de Valencia", href: "/carreteras/N-III", category: "carretera", icon: Route },
  { title: "N-IV Carretera de Cádiz", href: "/carreteras/N-IV", category: "carretera", icon: Route },
  { title: "N-V Carretera de Portugal", href: "/carreteras/N-V", category: "carretera", icon: Route },
  { title: "N-VI Carretera de La Coruña", href: "/carreteras/N-VI", category: "carretera", icon: Route },
];

// ─── Search functions ────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function fuzzyMatch(text: string, query: string): boolean {
  const t = normalize(text);
  const q = normalize(query);
  if (t.includes(q)) return true;
  let idx = 0;
  for (const ch of q) {
    const pos = t.indexOf(ch, idx);
    if (pos === -1) return false;
    idx = pos + 1;
  }
  return true;
}

function scoreResult(result: SearchResult, query: string): number {
  const title = normalize(result.title);
  const q = normalize(query);
  if (title.startsWith(q)) return 3;
  if (title.includes(q)) return 2;
  if (result.subtitle && normalize(result.subtitle).includes(q)) return 1;
  return 0;
}

export function filterResults(query: string): SearchResult[] {
  if (!query.trim()) return SEARCH_INDEX.slice(0, 12);
  return SEARCH_INDEX.filter(
    (r) =>
      fuzzyMatch(r.title, query) ||
      (r.subtitle ? fuzzyMatch(r.subtitle, query) : false)
  )
    .sort((a, b) => scoreResult(b, query) - scoreResult(a, query));
}

export function groupResults(
  results: SearchResult[]
): { category: SearchCategory; items: SearchResult[] }[] {
  const acc: Partial<Record<SearchCategory, SearchResult[]>> = {};
  for (const r of results) {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category]!.push(r);
  }
  return CATEGORY_ORDER.filter((c) => Boolean(acc[c])).map((c) => ({
    category: c,
    items: acc[c]!,
  }));
}
