"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchCategory =
  | "carretera"
  | "ciudad"
  | "provincia"
  | "herramienta"
  | "combustible";

export interface SearchResult {
  title: string;
  subtitle?: string;
  href: string;
  category: SearchCategory;
  icon: string;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  fuel: Fuel,
  radar: Radar,
  camera: Camera,
  calendar: Calendar,
  ban: Ban,
  alert: AlertCircle,
  calculator: Calculator,
  "map-pin": MapPin,
  zap: Zap,
  "alert-triangle": AlertTriangle,
  "book-open": BookOpen,
  code: Code,
  building: Building2,
  route: Route,
  map: Map,
};

function ResultIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? Search;
  return <Icon className={className} />;
}

// ─── Category labels & colours ────────────────────────────────────────────────

const CATEGORY_META: Record<
  SearchCategory,
  { label: string; badgeClass: string }
> = {
  herramienta: {
    label: "Herramientas",
    badgeClass: "bg-purple-100 text-purple-700",
  },
  combustible: {
    label: "Combustible",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  ciudad: { label: "Ciudades", badgeClass: "bg-green-100 text-green-700" },
  provincia: {
    label: "Provincias",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  carretera: {
    label: "Carreteras",
    badgeClass: "bg-tl-100 text-tl-700",
  },
};

// ─── Search index ─────────────────────────────────────────────────────────────

const SEARCH_INDEX: SearchResult[] = [
  // Combustible
  {
    title: "Precio Gasolina Hoy",
    subtitle: "Precios actualizados",
    href: "/precio-gasolina-hoy",
    category: "combustible",
    icon: "fuel",
  },
  {
    title: "Precio Diésel Hoy",
    subtitle: "Precios actualizados",
    href: "/precio-diesel-hoy",
    category: "combustible",
    icon: "fuel",
  },
  {
    title: "Mapa de Gasolineras",
    href: "/gasolineras/mapa",
    category: "combustible",
    icon: "map-pin",
  },
  // Herramientas
  {
    title: "Radares DGT",
    subtitle: "737 radares fijos",
    href: "/radares",
    category: "herramienta",
    icon: "radar",
  },
  {
    title: "Cámaras de Tráfico",
    subtitle: "1.917 cámaras",
    href: "/camaras",
    category: "herramienta",
    icon: "camera",
  },
  {
    title: "Operaciones Especiales",
    href: "/operaciones",
    category: "herramienta",
    icon: "calendar",
  },
  {
    title: "Restricciones",
    href: "/restricciones",
    category: "herramienta",
    icon: "ban",
  },
  {
    title: "Puntos Negros",
    href: "/puntos-negros",
    category: "herramienta",
    icon: "alert",
  },
  {
    title: "Calculadora de Ruta",
    href: "/calculadora",
    category: "herramienta",
    icon: "calculator",
  },
  {
    title: "Cargadores Eléctricos",
    href: "/carga-ev",
    category: "herramienta",
    icon: "zap",
  },
  {
    title: "Incidencias",
    subtitle: "En tiempo real",
    href: "/incidencias",
    category: "herramienta",
    icon: "alert-triangle",
  },
  {
    title: "Blog",
    href: "/blog",
    category: "herramienta",
    icon: "book-open",
  },
  {
    title: "API Docs",
    href: "/api-docs",
    category: "herramienta",
    icon: "code",
  },
  // Ciudades
  {
    title: "Madrid",
    href: "/ciudad/madrid",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Barcelona",
    href: "/ciudad/barcelona",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Valencia",
    href: "/ciudad/valencia",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Sevilla",
    href: "/ciudad/sevilla",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Zaragoza",
    href: "/ciudad/zaragoza",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Málaga",
    href: "/ciudad/malaga",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Murcia",
    href: "/ciudad/murcia",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Bilbao",
    href: "/ciudad/bilbao",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Alicante",
    href: "/ciudad/alicante",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Granada",
    href: "/ciudad/granada",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Valladolid",
    href: "/ciudad/valladolid",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Palma de Mallorca",
    href: "/ciudad/palma",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Las Palmas de Gran Canaria",
    href: "/ciudad/las-palmas",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Córdoba",
    href: "/ciudad/cordoba",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Alicante",
    href: "/ciudad/alicante",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Vigo",
    href: "/ciudad/vigo",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "Gijón",
    href: "/ciudad/gijon",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "A Coruña",
    href: "/ciudad/a-coruna",
    category: "ciudad",
    icon: "building",
  },
  {
    title: "San Sebastián",
    href: "/ciudad/san-sebastian",
    category: "ciudad",
    icon: "building",
  },
  // Provincias (52)
  {
    title: "Álava",
    href: "/provincia/alava",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Albacete",
    href: "/provincia/albacete",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Alicante",
    href: "/provincia/alicante",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Almería",
    href: "/provincia/almeria",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Asturias",
    href: "/provincia/asturias",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Ávila",
    href: "/provincia/avila",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Badajoz",
    href: "/provincia/badajoz",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Baleares",
    href: "/provincia/baleares",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Barcelona",
    href: "/provincia/barcelona",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Burgos",
    href: "/provincia/burgos",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Cáceres",
    href: "/provincia/caceres",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Cádiz",
    href: "/provincia/cadiz",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Cantabria",
    href: "/provincia/cantabria",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Castellón",
    href: "/provincia/castellon",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Ciudad Real",
    href: "/provincia/ciudad-real",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Córdoba",
    href: "/provincia/cordoba",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Cuenca",
    href: "/provincia/cuenca",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Gerona",
    href: "/provincia/gerona",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Granada",
    href: "/provincia/granada",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Guadalajara",
    href: "/provincia/guadalajara",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Guipúzcoa",
    href: "/provincia/guipuzcoa",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Huelva",
    href: "/provincia/huelva",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Huesca",
    href: "/provincia/huesca",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Jaén",
    href: "/provincia/jaen",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "La Rioja",
    href: "/provincia/la-rioja",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Las Palmas",
    href: "/provincia/las-palmas",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "León",
    href: "/provincia/leon",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Lérida",
    href: "/provincia/lerida",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Lugo",
    href: "/provincia/lugo",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Madrid",
    href: "/provincia/madrid",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Málaga",
    href: "/provincia/malaga",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Melilla",
    href: "/provincia/melilla",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Murcia",
    href: "/provincia/murcia",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Navarra",
    href: "/provincia/navarra",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Orense",
    href: "/provincia/orense",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Palencia",
    href: "/provincia/palencia",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Pontevedra",
    href: "/provincia/pontevedra",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Salamanca",
    href: "/provincia/salamanca",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Santa Cruz de Tenerife",
    href: "/provincia/santa-cruz-de-tenerife",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Segovia",
    href: "/provincia/segovia",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Sevilla",
    href: "/provincia/sevilla",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Soria",
    href: "/provincia/soria",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Tarragona",
    href: "/provincia/tarragona",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Teruel",
    href: "/provincia/teruel",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Toledo",
    href: "/provincia/toledo",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Valencia",
    href: "/provincia/valencia",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Valladolid",
    href: "/provincia/valladolid",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Vizcaya",
    href: "/provincia/vizcaya",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Zamora",
    href: "/provincia/zamora",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Zaragoza",
    href: "/provincia/zaragoza",
    category: "provincia",
    icon: "map-pin",
  },
  {
    title: "Ceuta",
    href: "/provincia/ceuta",
    category: "provincia",
    icon: "map-pin",
  },
  // Carreteras — Autopistas de peaje (AP)
  {
    title: "AP-1 Autopista del Norte",
    href: "/carreteras/AP-1",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-2 Autopista del Nordeste",
    href: "/carreteras/AP-2",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-4 Autopista del Sur",
    href: "/carreteras/AP-4",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-6 Autopista de Villalba",
    href: "/carreteras/AP-6",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-7 Autopista del Mediterráneo",
    href: "/carreteras/AP-7",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-8 Autopista del Cantábrico",
    href: "/carreteras/AP-8",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-9 Autopista del Atlántico",
    href: "/carreteras/AP-9",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-15 Autopista de Navarra",
    href: "/carreteras/AP-15",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-36 Autopista de Ocaña",
    href: "/carreteras/AP-36",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-41 Autopista Madrid-Toledo",
    href: "/carreteras/AP-41",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-51 Autopista de Ávila",
    href: "/carreteras/AP-51",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-61 Autopista de Segovia",
    href: "/carreteras/AP-61",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-68 Autopista del Ebro",
    href: "/carreteras/AP-68",
    category: "carretera",
    icon: "route",
  },
  {
    title: "AP-71 Autopista de León",
    href: "/carreteras/AP-71",
    category: "carretera",
    icon: "route",
  },
  // Autovías (A)
  {
    title: "A-1 Autovía del Norte",
    href: "/carreteras/A-1",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-2 Autovía del Nordeste",
    href: "/carreteras/A-2",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-3 Autovía del Este",
    href: "/carreteras/A-3",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-4 Autovía del Sur",
    href: "/carreteras/A-4",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-5 Autovía del Suroeste",
    href: "/carreteras/A-5",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-6 Autovía del Noroeste",
    href: "/carreteras/A-6",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-7 Autovía del Mediterráneo",
    href: "/carreteras/A-7",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-8 Autovía del Cantábrico",
    href: "/carreteras/A-8",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-10 Autovía de los Viñedos",
    href: "/carreteras/A-10",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-11 Autovía del Duero",
    href: "/carreteras/A-11",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-12 Autovía del Camino",
    href: "/carreteras/A-12",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-15 Autovía de Navarra",
    href: "/carreteras/A-15",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-21 Autovía de los Pirineos",
    href: "/carreteras/A-21",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-23 Autovía de Aragón",
    href: "/carreteras/A-23",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-30 Autovía Murcia-Cartagena",
    href: "/carreteras/A-30",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-31 Autovía de Alicante",
    href: "/carreteras/A-31",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-38 Autovía del Sur de Tenerife",
    href: "/carreteras/A-38",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-40 Autovía de Castilla",
    href: "/carreteras/A-40",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-41 Autovía de Andalucía",
    href: "/carreteras/A-41",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-42 Autovía de Toledo",
    href: "/carreteras/A-42",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-43 Autovía de Manzanares",
    href: "/carreteras/A-43",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-44 Autovía de Sierra Nevada",
    href: "/carreteras/A-44",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-45 Autovía de Málaga",
    href: "/carreteras/A-45",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-48 Autovía de Cádiz",
    href: "/carreteras/A-48",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-49 Autovía del Quinto Centenario",
    href: "/carreteras/A-49",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-52 Autovía de las Rías Bajas",
    href: "/carreteras/A-52",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-55 Autovía do Atlántico",
    href: "/carreteras/A-55",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-57 Autovía de Pontevedra",
    href: "/carreteras/A-57",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-62 Autovía de Castilla",
    href: "/carreteras/A-62",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-63 Autovía de Burgos",
    href: "/carreteras/A-63",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-66 Autovía de la Plata",
    href: "/carreteras/A-66",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-67 Autovía de la Meseta",
    href: "/carreteras/A-67",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-68 Autovía del Ebro",
    href: "/carreteras/A-68",
    category: "carretera",
    icon: "route",
  },
  {
    title: "A-92 Autovía de Andalucía",
    href: "/carreteras/A-92",
    category: "carretera",
    icon: "route",
  },
  // Nacionales (N)
  {
    title: "N-I Carretera de Irún",
    href: "/carreteras/N-I",
    category: "carretera",
    icon: "route",
  },
  {
    title: "N-II Carretera de Francia",
    href: "/carreteras/N-II",
    category: "carretera",
    icon: "route",
  },
  {
    title: "N-III Carretera de Valencia",
    href: "/carreteras/N-III",
    category: "carretera",
    icon: "route",
  },
  {
    title: "N-IV Carretera de Cádiz",
    href: "/carreteras/N-IV",
    category: "carretera",
    icon: "route",
  },
  {
    title: "N-V Carretera de Portugal",
    href: "/carreteras/N-V",
    category: "carretera",
    icon: "route",
  },
  {
    title: "N-VI Carretera de La Coruña",
    href: "/carreteras/N-VI",
    category: "carretera",
    icon: "route",
  },
];

// ─── Fuzzy search helper ──────────────────────────────────────────────────────

function fuzzyMatch(text: string, query: string): boolean {
  const normalised = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const t = normalised(text);
  const q = normalised(query);

  if (t.includes(q)) return true;

  // Check if all chars appear in order (very loose fuzzy)
  let idx = 0;
  for (const ch of q) {
    const pos = t.indexOf(ch, idx);
    if (pos === -1) return false;
    idx = pos + 1;
  }
  return true;
}

function scoreResult(result: SearchResult, query: string): number {
  const normalised = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const title = normalised(result.title);
  const q = normalised(query);

  if (title.startsWith(q)) return 3;
  if (title.includes(q)) return 2;
  if (result.subtitle && normalised(result.subtitle).includes(q)) return 1;
  return 0;
}

function filterResults(query: string): SearchResult[] {
  if (!query.trim()) return SEARCH_INDEX.slice(0, 8);

  return SEARCH_INDEX.filter(
    (r) =>
      fuzzyMatch(r.title, query) ||
      (r.subtitle ? fuzzyMatch(r.subtitle, query) : false)
  )
    .sort((a, b) => scoreResult(b, query) - scoreResult(a, query))
    .slice(0, 20);
}

// ─── Category order for grouping ─────────────────────────────────────────────

const CATEGORY_ORDER: SearchCategory[] = [
  "herramienta",
  "combustible",
  "carretera",
  "ciudad",
  "provincia",
];

function groupResults(
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

// ─── Component ────────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Debounce query
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setActiveIndex(0);
      setMounted(false);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => setMounted(true));
      // Focus input after the DOM paints
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const results = filterResults(debouncedQuery);
  const groups = groupResults(results);

  // Flat list for keyboard navigation
  const flatResults = groups.flatMap((g) => g.items);

  const navigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  // Keyboard handler
  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatResults[activeIndex];
        if (selected) navigate(selected.href);
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, flatResults, activeIndex, navigate, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  if (!isOpen) return null;

  let globalIdx = 0;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-[10vh] transition-opacity duration-200 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda global"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          mounted ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar carreteras, ciudades, herramientas..."
            className="flex-1 text-base text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Borrar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-500">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto overscroll-contain"
          role="listbox"
        >
          {flatResults.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p>Sin resultados para &ldquo;{debouncedQuery}&rdquo;</p>
            </div>
          ) : (
            <>
              {groups.map(({ category, items }) => {
                const meta = CATEGORY_META[category];
                return (
                  <div key={category}>
                    {/* Category header */}
                    <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {meta.label}
                      </span>
                    </div>

                    {/* Items */}
                    {items.map((result) => {
                      const idx = globalIdx++;
                      const isActive = idx === activeIndex;

                      return (
                        <button
                          key={result.href}
                          data-index={idx}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => navigate(result.href)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isActive
                              ? "bg-tl-50 text-tl-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {/* Icon */}
                          <span
                            className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                              isActive
                                ? "bg-tl-100 text-tl-600"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            <ResultIcon
                              name={result.icon}
                              className="w-4 h-4"
                            />
                          </span>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                isActive ? "text-tl-700" : "text-gray-900"
                              }`}
                            >
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-gray-500 truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>

                          {/* Category badge */}
                          <span
                            className={`hidden sm:inline-flex shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[10px]">
              ↑↓
            </kbd>
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[10px]">
              ↵
            </kbd>
            abrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
            cerrar
          </span>
          <span className="ml-auto font-medium text-gray-300">
            trafico.live
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Keyboard shortcut hook (for external use) ────────────────────────────────

export function useSearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}
