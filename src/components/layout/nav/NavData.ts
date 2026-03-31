import {
  Map,
  AlertTriangle,
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
  Building2,
  MapPinned,
  Users,
  BookOpen,
  BarChart3,
  FileText,
  Newspaper,
  Bike,
  Clock,
  Ban,
  Truck,
  Timer,
  Radio,
  TrendingUp,
  Code2,
  Anchor,
  Wind,
  ShieldAlert,
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

export type MegaMenuPanel = {
  id: string;
  label: string;
  categories: NavCategory[];
  cityStrip?: { name: string; slug: string }[];
};

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

// ─── Mega Menu Panels ────────────────────────────────────────
export const megaMenuPanels: MegaMenuPanel[] = [
  {
    id: "trafico",
    label: "Tráfico",
    cityStrip: topCities,
    categories: [
      {
        title: "En directo",
        items: [
          { name: "Mapa en vivo", href: "/mapa", icon: Map, description: "Tráfico en tiempo real" },
          { name: "Atascos", href: "/atascos", icon: AlertTriangle, description: "Retenciones actuales" },
          { name: "Alertas meteo", href: "/alertas-meteo", icon: Cloud, description: "Avisos de AEMET" },
          { name: "Paneles PMV", href: "/paneles", icon: MonitorSmartphone, description: "Mensajes en carretera" },
        ],
      },
      {
        title: "Incidencias",
        items: [
          { name: "Todas las incidencias", href: "/incidencias", icon: AlertTriangle, description: "Incidentes en curso" },
          { name: "Cortes de tráfico", href: "/cortes-trafico", icon: Ban, description: "Vías cortadas" },
          { name: "Restricciones", href: "/restricciones", icon: Ban, description: "Limitaciones activas" },
          { name: "Mejor hora para viajar", href: "/mejor-hora", icon: Timer, description: "Horas valle y punta" },
        ],
      },
      {
        title: "Cámaras",
        items: [
          { name: "Cámaras DGT", href: "/camaras", icon: Camera, description: "Imágenes en directo" },
          { name: "Madrid", href: "/camaras/madrid", icon: Camera },
          { name: "Barcelona", href: "/camaras/barcelona", icon: Camera },
          { name: "Valencia", href: "/camaras/valencia", icon: Camera },
        ],
      },
    ],
  },
  {
    id: "carreteras",
    label: "Carreteras",
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
        title: "Infraestructura",
        items: [
          { name: "Radares", href: "/radares", icon: Radar, description: "Ubicaciones y tipos" },
          { name: "Puntos negros", href: "/puntos-negros", icon: Skull, description: "Tramos peligrosos" },
        ],
      },
      {
        title: "Datos",
        items: [
          { name: "Intensidad (IMD)", href: "/intensidad", icon: TrendingUp, description: "Tráfico por carretera" },
          { name: "Estaciones de aforo", href: "/estaciones-aforo", icon: Radio, description: "3.458 puntos de medición" },
          { name: "Estadísticas", href: "/estadisticas", icon: BarChart3, description: "Cifras del tráfico" },
          { name: "Histórico", href: "/historico", icon: Clock, description: "Datos acumulados" },
          { name: "Operaciones DGT", href: "/operaciones", icon: Users, description: "Campañas especiales" },
        ],
      },
    ],
  },
  {
    id: "combustible",
    label: "Combustible",
    categories: [
      {
        title: "Precios",
        items: [
          { name: "Precio gasolina hoy", href: "/precio-gasolina-hoy", icon: Fuel, description: "Media nacional actualizada" },
          { name: "Precio diésel hoy", href: "/precio-diesel-hoy", icon: Fuel, description: "Media nacional actualizada" },
          { name: "Por provincia", href: "/gasolineras/precios", icon: MapPin, description: "Comparar 52 provincias" },
          { name: "Calculadora", href: "/calculadora", icon: Calculator, description: "Coste de tu viaje" },
        ],
      },
      {
        title: "Gasolineras",
        items: [
          { name: "Cerca de mí", href: "/gasolineras/cerca", icon: MapPin, description: "Las más próximas" },
          { name: "Las más baratas", href: "/gasolineras/baratas", icon: Fuel, description: "Mejores precios" },
          { name: "24 horas", href: "/gasolineras-24-horas", icon: Clock, description: "Abiertas siempre" },
          { name: "Por marcas", href: "/gasolineras/marcas", icon: Tag, description: "Repsol, Cepsa, BP..." },
        ],
      },
      {
        title: "Eléctricos",
        items: [
          { name: "Cargadores EV", href: "/carga-ev", icon: Zap, description: "Puntos de carga" },
          { name: "Cuánto cuesta cargar", href: "/cuanto-cuesta-cargar", icon: Calculator, description: "Calcula el coste" },
          { name: "Etiqueta ambiental", href: "/etiqueta-ambiental", icon: Tag, description: "Consulta tu distintivo" },
        ],
      },
    ],
  },
  {
    id: "explorar",
    label: "Explorar",
    categories: [
      {
        title: "Territorio",
        items: [
          { name: "Comunidades autónomas", href: "/comunidad-autonoma", icon: Building2, description: "19 comunidades" },
          { name: "Provincias", href: "/espana", icon: MapPinned, description: "52 provincias" },
          { name: "Ciudades", href: "/ciudad", icon: MapPin, description: "Principales urbes" },
          { name: "Municipios", href: "/municipio", icon: MapPin, description: "Todos los municipios" },
        ],
      },
      {
        title: "Ciudades populares",
        items: [
          { name: "Madrid", href: "/ciudad/madrid", icon: MapPin },
          { name: "Barcelona", href: "/ciudad/barcelona", icon: MapPin },
          { name: "Valencia", href: "/ciudad/valencia", icon: MapPin },
          { name: "Sevilla", href: "/ciudad/sevilla", icon: MapPin },
        ],
      },
      {
        title: "Contenido",
        items: [
          { name: "Noticias", href: "/noticias", icon: BookOpen, description: "Informes, guías y alertas" },
          { name: "Informe diario", href: "/informe-diario", icon: FileText, description: "Resumen del día" },
          { name: "Informes", href: "/informes", icon: BarChart3, description: "Informes periódicos" },
          { name: "Ciclistas", href: "/ciclistas", icon: Bike, description: "Info para ciclistas" },
        ],
      },
    ],
  },
  {
    id: "maritimo",
    label: "Marítimo",
    categories: [
      {
        title: "Combustible y puertos",
        items: [
          { name: "Combustible Marítimo", href: "/maritimo/combustible", icon: Fuel, description: "Precios en puertos españoles" },
          { name: "Puertos de España", href: "/maritimo/puertos", icon: Anchor, description: "Directorio de puertos" },
          { name: "Mapa Marítimo", href: "/maritimo/mapa", icon: Map, description: "Estaciones en el litoral" },
        ],
      },
      {
        title: "Meteorología y seguridad",
        items: [
          { name: "Meteorología costera", href: "/maritimo/meteorologia", icon: Wind, description: "Alertas y previsiones AEMET" },
          { name: "Seguridad Marítima", href: "/maritimo/seguridad", icon: ShieldAlert, description: "SASEMAR, emergencias, consejos" },
          { name: "Noticias Marítimas", href: "/maritimo/noticias", icon: Newspaper, description: "Informes y novedades" },
        ],
      },
      {
        title: "Hub",
        items: [
          { name: "Inicio Marítimo", href: "/maritimo", icon: Anchor, description: "Panel general marítimo" },
        ],
      },
    ],
  },
  {
    id: "profesional",
    label: "Profesional",
    categories: [
      {
        title: "Flotas y transporte",
        items: [
          { name: "Diésel más barato", href: "/profesional/diesel", icon: Fuel, description: "Mejores precios para tu flota" },
          { name: "Áreas de descanso", href: "/profesional/areas", icon: MapPin, description: "Parking seguro 24h" },
          { name: "Restricciones activas", href: "/profesional/restricciones", icon: Ban, description: "ZBE, peso y altura" },
          { name: "Calculadora de ruta", href: "/calculadora", icon: Calculator, description: "Coste de combustible y peajes" },
          { name: "Noticias profesionales", href: "/profesional/noticias", icon: Newspaper, description: "Informes y alertas para flotas" },
        ],
      },
      {
        title: "Herramientas",
        items: [
          { name: "Mejor hora para viajar", href: "/mejor-hora", icon: Clock, description: "Evita horas punta" },
          { name: "Operaciones DGT", href: "/operaciones", icon: Users, description: "Campañas especiales" },
          { name: "Etiqueta ambiental", href: "/etiqueta-ambiental", icon: Tag, description: "Consulta tu distintivo" },
          { name: "Informe diario", href: "/informe-diario", icon: FileText, description: "Resumen del día" },
        ],
      },
      {
        title: "API y datos",
        items: [
          { name: "API REST", href: "/api-docs", icon: Code2, description: "Datos en tiempo real" },
          { name: "Estadísticas", href: "/estadisticas", icon: BarChart3, description: "Cifras del tráfico" },
          { name: "Histórico", href: "/historico", icon: Clock, description: "Datos acumulados" },
        ],
      },
    ],
  },
];

// ─── Footer columns ──────────────────────────────────────────
export const footerColumns = [
  {
    title: "Tráfico en vivo",
    links: [
      { name: "Inicio", href: "/" },
      { name: "Mapa en vivo", href: "/mapa" },
      { name: "Incidencias", href: "/incidencias" },
      { name: "Cámaras DGT", href: "/camaras" },
      { name: "Atascos", href: "/atascos" },
      { name: "Cortes de tráfico", href: "/cortes-trafico" },
      { name: "Alertas meteo", href: "/alertas-meteo" },
      { name: "Mejor hora para viajar", href: "/mejor-hora" },
    ],
  },
  {
    title: "Carreteras",
    links: [
      { name: "Autopistas", href: "/carreteras/autopistas" },
      { name: "Autovías", href: "/carreteras/autovias" },
      { name: "Nacionales", href: "/carreteras/nacionales" },
      { name: "Intensidad (IMD)", href: "/intensidad" },
      { name: "Estaciones de aforo", href: "/estaciones-aforo" },
      { name: "Radares", href: "/radares" },
      { name: "Puntos negros", href: "/puntos-negros" },
    ],
  },
  {
    title: "Combustible",
    links: [
      { name: "Precio gasolina hoy", href: "/precio-gasolina-hoy" },
      { name: "Precio diésel hoy", href: "/precio-diesel-hoy" },
      { name: "Precios por provincia", href: "/gasolineras/precios" },
      { name: "Gasolineras baratas", href: "/gasolineras/baratas" },
      { name: "24 horas", href: "/gasolineras-24-horas" },
      { name: "Mapa gasolineras", href: "/gasolineras/mapa" },
    ],
  },
  {
    title: "Marítimo",
    links: [
      { name: "Hub Marítimo", href: "/maritimo" },
      { name: "Combustible Marítimo", href: "/maritimo/combustible" },
      { name: "Meteorología costera", href: "/maritimo/meteorologia" },
      { name: "Puertos", href: "/maritimo/puertos" },
      { name: "Seguridad marítima", href: "/maritimo/seguridad" },
      { name: "Noticias marítimas", href: "/maritimo/noticias" },
      { name: "Mapa Marítimo", href: "/maritimo/mapa" },
    ],
  },
  {
    title: "Movilidad sostenible",
    links: [
      { name: "Cargadores EV", href: "/carga-ev" },
      { name: "Zonas ZBE", href: "/explorar/infraestructura" },
      { name: "Etiqueta ambiental", href: "/etiqueta-ambiental" },
      { name: "Cuánto cuesta cargar", href: "/cuanto-cuesta-cargar" },
      { name: "Ciclistas", href: "/ciclistas" },
    ],
  },
  {
    title: "Descubre",
    links: [
      { name: "Comunidades", href: "/comunidad-autonoma" },
      { name: "Provincias", href: "/espana" },
      { name: "Noticias", href: "/noticias" },
      { name: "Informe diario", href: "/informe-diario" },
    ],
  },
  {
    title: "Info",
    links: [
      { name: "Profesional", href: "/profesional" },
      { name: "Informes", href: "/informes" },
      { name: "Prensa", href: "/media" },
      { name: "Sobre nosotros", href: "/sobre" },
      { name: "API", href: "/api-docs" },
      { name: "Aviso legal", href: "/aviso-legal" },
      { name: "Privacidad", href: "/politica-privacidad" },
      { name: "Cookies", href: "/politica-cookies" },
    ],
  },
];

// Flatten all mega menu items for active route checking
export const allMegaMenuItems = megaMenuPanels.flatMap((panel) =>
  panel.categories.flatMap((cat) => cat.items)
);
