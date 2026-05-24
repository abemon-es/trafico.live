import {
  Map,
  AlertTriangle,
  Activity,
  Camera,
  Cloud,
  MonitorSmartphone,
  Route,
  Radar,
  Skull,
  Fuel,
  MapPin,
  Zap,
  Calculator,
  Tag,
  BarChart3,
  Clock,
  Ban,
  Train,
  Bus,
  Anchor,
  Wind,
  ShieldAlert,
  Ship,
  Plane,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export type NavCategory = {
  title: string;
  items: NavItem[];
};

export type PanelHub = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href: string;
  accent: "tl" | "tl-amber" | "tl-sea";
};

export type MegaMenuPanel = {
  id: string;
  label: string;
  hub: PanelHub;
  categories: NavCategory[];
  cityStrip?: { name: string; slug: string }[];
};

// ─── Accent color system ────────────────────────────────────
export const ACCENT_STYLES = {
  tl: {
    hubBg: "bg-tl-50 dark:bg-tl-950/60",
    iconBg: "bg-tl-100 dark:bg-tl-800/40",
    iconText: "text-tl-600 dark:text-tl-300",
    title: "text-tl-700 dark:text-tl-200",
    cta: "bg-tl-600 hover:bg-tl-700 dark:bg-tl-500 dark:hover:bg-tl-400 text-white",
    stat: "text-tl-600 dark:text-tl-300",
    bar: "bg-tl-500",
    gradient:
      "linear-gradient(to right, var(--color-tl-600), var(--color-tl-400), var(--color-tl-amber-400))",
  },
  "tl-amber": {
    hubBg: "bg-tl-amber-50 dark:bg-tl-amber-950/60",
    iconBg: "bg-tl-amber-100 dark:bg-tl-amber-800/40",
    iconText: "text-tl-amber-600 dark:text-tl-amber-300",
    title: "text-tl-amber-700 dark:text-tl-amber-200",
    cta: "bg-tl-amber-600 hover:bg-tl-amber-700 dark:bg-tl-amber-500 dark:hover:bg-tl-amber-400 text-white",
    stat: "text-tl-amber-600 dark:text-tl-amber-300",
    bar: "bg-tl-amber-500",
    gradient:
      "linear-gradient(to right, var(--color-tl-amber-600), var(--color-tl-amber-400), var(--color-tl-300))",
  },
  "tl-sea": {
    hubBg: "bg-tl-sea-50 dark:bg-tl-sea-950/60",
    iconBg: "bg-tl-sea-100 dark:bg-tl-sea-800/40",
    iconText: "text-tl-sea-600 dark:text-tl-sea-300",
    title: "text-tl-sea-700 dark:text-tl-sea-200",
    cta: "bg-tl-sea-600 hover:bg-tl-sea-700 dark:bg-tl-sea-500 dark:hover:bg-tl-sea-400 text-white",
    stat: "text-tl-sea-600 dark:text-tl-sea-300",
    bar: "bg-tl-sea-500",
    gradient:
      "linear-gradient(to right, var(--color-tl-sea-600), var(--color-tl-sea-400), var(--color-tl-300))",
  },
} as const;

// ─── City data ───────────────────────────────────────────────
export const topCities = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Málaga", slug: "malaga" },
  { name: "Murcia", slug: "murcia" },
];

export const footerCities = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Málaga", slug: "malaga" },
  { name: "Murcia", slug: "murcia" },
  { name: "Palma", slug: "palma" },
  { name: "Alicante", slug: "alicante" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Valladolid", slug: "valladolid" },
  { name: "Córdoba", slug: "cordoba" },
  { name: "Vigo", slug: "vigo" },
  { name: "Granada", slug: "granada" },
  { name: "Oviedo", slug: "oviedo" },
];

// ─── Mega Menu Panels (5 panels) ─────────────────────────────
export const megaMenuPanels: MegaMenuPanel[] = [
  // ── Panel 1: Tráfico ahora ──────────────────────────────────
  {
    id: "trafico",
    label: "Tráfico ahora",
    hub: {
      icon: Activity,
      title: "Tráfico en España",
      subtitle: "Estado en tiempo real de la red vial",
      href: "/",
      accent: "tl",
    },
    cityStrip: topCities,
    categories: [
      {
        title: "En vivo",
        items: [
          { name: "Mapa en vivo", href: "/mapa", icon: Map, description: "Tráfico en tiempo real" },
          { name: "Atascos", href: "/atascos", icon: AlertTriangle, description: "Retenciones actuales" },
          { name: "Incidencias", href: "/incidencias", icon: AlertTriangle, description: "Incidentes en curso" },
          { name: "Alertas AEMET", href: "/alertas-meteo", icon: Cloud, description: "Avisos meteorológicos" },
          { name: "Cortes y obras", href: "/cortes-trafico", icon: Ban, description: "Vías cortadas" },
          { name: "Paneles PMV", href: "/paneles", icon: MonitorSmartphone, description: "Mensajes en carretera" },
        ],
      },
      {
        title: "Cámaras DGT",
        items: [
          { name: "Todas las cámaras", href: "/camaras", icon: Camera, description: "Imágenes en directo" },
          { name: "Madrid", href: "/camaras/madrid", icon: Camera },
          { name: "Barcelona", href: "/camaras/barcelona", icon: Camera },
          { name: "Valencia", href: "/camaras/valencia", icon: Camera },
          { name: "Sevilla", href: "/camaras/sevilla", icon: Camera },
          { name: "Por carretera", href: "/camaras", icon: Camera },
        ],
      },
      {
        title: "Por provincia",
        items: [
          { name: "Estado por provincia", href: "/espana", icon: MapPin, description: "52 provincias" },
          { name: "Madrid", href: "/provincias/28", icon: MapPin },
          { name: "Barcelona", href: "/provincias/08", icon: MapPin },
          { name: "Valencia", href: "/provincias/46", icon: MapPin },
          { name: "Sevilla", href: "/provincias/41", icon: MapPin },
          { name: "Ver todas", href: "/espana", icon: MapPin },
        ],
      },
      {
        title: "Operativos DGT",
        items: [
          { name: "Semana Santa", href: "/operativos/semana-santa", icon: Users, description: "Operación especial DGT" },
          { name: "Puente de Mayo", href: "/operativos/puente-mayo", icon: Users, description: "Operación especial DGT" },
          { name: "Verano", href: "/operativos/verano", icon: Users, description: "Operación especial DGT" },
          { name: "Navidad", href: "/operativos/navidad", icon: Users, description: "Operación especial DGT" },
          { name: "Ver todos", href: "/operaciones", icon: Users },
        ],
      },
    ],
  },

  // ── Panel 2: Carreteras ──────────────────────────────────────
  {
    id: "carreteras",
    label: "Carreteras",
    hub: {
      icon: Route,
      title: "Red de carreteras",
      subtitle: "Infraestructura vial de España",
      href: "/carreteras",
      accent: "tl",
    },
    categories: [
      {
        title: "Por tipo",
        items: [
          { name: "Autopistas", href: "/carreteras/autopistas", icon: Route, description: "Red AP" },
          { name: "Autovías", href: "/carreteras/autovias", icon: Route, description: "Red A" },
          { name: "Nacionales", href: "/carreteras/nacionales", icon: Route, description: "Red N" },
          { name: "Regionales", href: "/carreteras/regionales", icon: Route, description: "Red autonómica" },
        ],
      },
      {
        title: "Más buscadas",
        items: [
          { name: "AP-7", href: "/carreteras/ap-7", icon: Route },
          { name: "AP-4", href: "/carreteras/ap-4", icon: Route },
          { name: "AP-9", href: "/carreteras/ap-9", icon: Route },
          { name: "A-1", href: "/carreteras/a-1", icon: Route },
          { name: "A-2", href: "/carreteras/a-2", icon: Route },
          { name: "A-3", href: "/carreteras/a-3", icon: Route },
          { name: "A-7", href: "/carreteras/a-7", icon: Route },
          { name: "A-8", href: "/carreteras/a-8", icon: Route },
          { name: "A-92", href: "/carreteras/a-92", icon: Route },
        ],
      },
      {
        title: "Rondas urbanas",
        items: [
          { name: "M-30 Madrid", href: "/rondas/m-30", icon: Route },
          { name: "M-40 Madrid", href: "/rondas/m-40", icon: Route },
          { name: "Ronda Dalt Barcelona", href: "/rondas/ronda-dalt", icon: Route },
          { name: "Ronda Litoral Barcelona", href: "/rondas/ronda-litoral", icon: Route },
          { name: "Bypass Valencia", href: "/rondas/bypass-valencia", icon: Route },
        ],
      },
      {
        title: "Más",
        items: [
          { name: "Radares", href: "/radares", icon: Radar, description: "Ubicaciones y tipos" },
          { name: "Puntos negros", href: "/puntos-negros", icon: Skull, description: "Tramos peligrosos" },
          { name: "ZBE", href: "/zbe", icon: Ban, description: "Zonas de bajas emisiones" },
          { name: "Peajes", href: "/peajes", icon: Route, description: "17 autopistas de pago" },
          { name: "Intensidad IMD", href: "/intensidad", icon: BarChart3, description: "Tráfico por carretera" },
        ],
      },
    ],
  },

  // ── Panel 3: Trenes ──────────────────────────────────────────
  {
    id: "trenes",
    label: "Trenes",
    hub: {
      icon: Train,
      title: "Red ferroviaria",
      subtitle: "Renfe en tiempo real",
      href: "/trenes",
      accent: "tl",
    },
    categories: [
      {
        title: "En vivo",
        items: [
          { name: "Mapa Renfe en directo", href: "/trenes", icon: Train, description: "Posiciones GPS en tiempo real" },
          { name: "Incidencias Renfe", href: "/trenes/incidencias", icon: AlertTriangle, description: "Alertas de servicio" },
          { name: "Flota", href: "/trenes", icon: Train, description: "Flota activa LD" },
          { name: "Puntualidad", href: "/trenes/live", icon: BarChart3, description: "Estadísticas en directo" },
        ],
      },
      {
        title: "Cercanías",
        items: [
          { name: "Todas las redes", href: "/trenes/cercanias", icon: Train, description: "12 redes Cercanías" },
          { name: "Madrid", href: "/trenes/cercanias/madrid", icon: Train },
          { name: "Barcelona", href: "/trenes/cercanias/barcelona", icon: Train },
          { name: "Valencia", href: "/trenes/cercanias/valencia", icon: Train },
          { name: "Bilbao", href: "/trenes/cercanias/bilbao", icon: Train },
          { name: "Sevilla", href: "/trenes/cercanias/sevilla", icon: Train },
        ],
      },
      {
        title: "Líneas + estaciones",
        items: [
          { name: "Catálogo de líneas", href: "/trenes/lineas", icon: Route, description: "1.248 rutas" },
          { name: "Estaciones", href: "/trenes/estaciones", icon: MapPin, description: "2.154 estaciones" },
          { name: "AVE", href: "/trenes/lineas", icon: Train },
          { name: "Avlo", href: "/trenes/lineas", icon: Train },
          { name: "LD", href: "/trenes/lineas", icon: Train },
        ],
      },
    ],
  },

  // ── Panel 4: Otros transportes ───────────────────────────────
  {
    id: "transportes",
    label: "Otros transportes",
    hub: {
      icon: Bus,
      title: "Transporte multimodal",
      subtitle: "Marítimo, aéreo y público",
      href: "/transporte-publico",
      accent: "tl-sea",
    },
    categories: [
      {
        title: "Marítimo",
        items: [
          { name: "Mapa AIS de buques", href: "/barcos/mapa", icon: Ship, description: "Tráfico marítimo en vivo" },
          { name: "Puertos", href: "/maritimo/puertos", icon: Anchor, description: "Directorio de puertos" },
          { name: "Ferries", href: "/maritimo/ferries", icon: Ship, description: "Rutas y horarios" },
          { name: "Seguridad SASEMAR", href: "/maritimo/seguridad/estadisticas", icon: ShieldAlert, description: "Emergencias marítimas" },
          { name: "Meteorología marina", href: "/maritimo/meteorologia", icon: Wind, description: "Alertas y previsiones" },
        ],
      },
      {
        title: "Aviación",
        items: [
          { name: "Aviones en vivo", href: "/aviacion", icon: Plane, description: "Posiciones ADS-B" },
          { name: "Aeropuertos AENA", href: "/aviacion/aeropuertos", icon: Plane, description: "42 aeropuertos" },
          { name: "Vuelos cancelados", href: "/aviacion/cancelados", icon: Plane, description: "Estado de cancelaciones" },
        ],
      },
      {
        title: "Transporte público",
        items: [
          { name: "Operadores", href: "/transporte-publico", icon: Bus, description: "15+ operadores GTFS" },
          { name: "Metro Madrid", href: "/transporte-publico/metro-madrid", icon: Train },
          { name: "TMB Barcelona", href: "/transporte-publico/tmb", icon: Bus },
          { name: "Buses urbanos", href: "/transporte-publico", icon: Bus },
        ],
      },
    ],
  },

  // ── Panel 5: Combustible & EV ────────────────────────────────
  {
    id: "combustible",
    label: "Combustible & EV",
    hub: {
      icon: Fuel,
      title: "Combustible & EV",
      subtitle: "Precios actualizados hoy",
      href: "/gasolineras",
      accent: "tl-amber",
    },
    categories: [
      {
        title: "Precios hoy",
        items: [
          { name: "Gasolina 95", href: "/precio-gasolina-hoy", icon: Fuel, description: "Media nacional actualizada" },
          { name: "Diésel", href: "/precio-diesel-hoy", icon: Fuel, description: "Media nacional actualizada" },
          { name: "GLP", href: "/gasolineras", icon: Fuel, description: "Gas licuado del petróleo" },
          { name: "Por provincia", href: "/gasolineras/precios", icon: MapPin, description: "Comparar 52 provincias" },
          { name: "Histórico CNMC", href: "/gasolineras/historico", icon: BarChart3, description: "Precios desde 2016" },
        ],
      },
      {
        title: "Encontrar",
        items: [
          { name: "24 horas", href: "/gasolineras-24-horas", icon: Clock, description: "Abiertas siempre" },
          { name: "Baratas", href: "/gasolineras/baratas", icon: Fuel, description: "Mejores precios" },
          { name: "Cerca de mí", href: "/gasolineras", icon: MapPin, description: "Las más próximas" },
          { name: "Por marca", href: "/gasolineras", icon: Tag, description: "Repsol, Cepsa, BP..." },
        ],
      },
      {
        title: "EV + herramientas",
        items: [
          { name: "Cargadores EV", href: "/carga-ev", icon: Zap, description: "Puntos de carga" },
          { name: "Calculadora ruta", href: "/calculadora", icon: Calculator, description: "Combustible y peajes" },
          { name: "Electrolineras", href: "/electrolineras", icon: Zap, description: "Puntos de carga rápida" },
          { name: "Coste de cargar", href: "/cuanto-cuesta-cargar", icon: Calculator, description: "Calcula el coste EV" },
        ],
      },
    ],
  },
];

// ─── Footer columns (aligned with mega menu panels) ─────────
export type FooterColumn = {
  title: string;
  icon: LucideIcon;
  accent: "tl" | "tl-amber" | "tl-sea";
  hub: string;
  links: { name: string; href: string }[];
};

export const footerColumns: FooterColumn[] = [
  {
    title: "Tráfico ahora",
    icon: Activity,
    accent: "tl",
    hub: "/",
    links: [
      { name: "Mapa en vivo", href: "/mapa" },
      { name: "Incidencias", href: "/incidencias" },
      { name: "Cámaras DGT", href: "/camaras" },
      { name: "Atascos", href: "/atascos" },
      { name: "Cortes de tráfico", href: "/cortes-trafico" },
      { name: "Alertas meteo", href: "/alertas-meteo" },
      { name: "Operativos DGT", href: "/operaciones" },
      { name: "Paneles PMV", href: "/paneles" },
    ],
  },
  {
    title: "Carreteras",
    icon: Route,
    accent: "tl",
    hub: "/carreteras",
    links: [
      { name: "Autopistas", href: "/carreteras/autopistas" },
      { name: "Autovías", href: "/carreteras/autovias" },
      { name: "Nacionales", href: "/carreteras/nacionales" },
      { name: "Radares", href: "/radares" },
      { name: "Peajes", href: "/peajes" },
      { name: "Puntos negros", href: "/puntos-negros" },
      { name: "Zonas ZBE", href: "/zbe" },
      { name: "Intensidad IMD", href: "/intensidad" },
    ],
  },
  {
    title: "Trenes",
    icon: Train,
    accent: "tl",
    hub: "/trenes",
    links: [
      { name: "Renfe en directo", href: "/trenes" },
      { name: "Incidencias Renfe", href: "/trenes/incidencias" },
      { name: "Cercanías", href: "/trenes/cercanias" },
      { name: "Cercanías Madrid", href: "/trenes/cercanias/madrid" },
      { name: "Cercanías Barcelona", href: "/trenes/cercanias/barcelona" },
      { name: "Líneas", href: "/trenes/lineas" },
      { name: "Estaciones", href: "/trenes/estaciones" },
      { name: "Puntualidad", href: "/trenes/live" },
    ],
  },
  {
    title: "Combustible & EV",
    icon: Fuel,
    accent: "tl-amber",
    hub: "/gasolineras",
    links: [
      { name: "Gasolina hoy", href: "/precio-gasolina-hoy" },
      { name: "Diésel hoy", href: "/precio-diesel-hoy" },
      { name: "Por provincia", href: "/gasolineras/precios" },
      { name: "Baratas", href: "/gasolineras/baratas" },
      { name: "24 horas", href: "/gasolineras-24-horas" },
      { name: "Cargadores EV", href: "/carga-ev" },
      { name: "Calculadora ruta", href: "/calculadora" },
      { name: "Histórico CNMC", href: "/gasolineras/historico" },
    ],
  },
  {
    title: "Otros transportes",
    icon: Bus,
    accent: "tl-sea",
    hub: "/transporte-publico",
    links: [
      { name: "Buques AIS", href: "/barcos/mapa" },
      { name: "Puertos", href: "/maritimo/puertos" },
      { name: "Ferries", href: "/maritimo/ferries" },
      { name: "Aviones en vivo", href: "/aviacion" },
      { name: "Aeropuertos AENA", href: "/aviacion/aeropuertos" },
      { name: "Transporte público", href: "/transporte-publico" },
      { name: "Calidad del aire", href: "/calidad-aire" },
      { name: "Estadísticas", href: "/estadisticas-transporte" },
    ],
  },
];

// Flatten all mega menu items for active route checking
export const allMegaMenuItems = megaMenuPanels.flatMap((panel) =>
  panel.categories.flatMap((cat) => cat.items)
);
