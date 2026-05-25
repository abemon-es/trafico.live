import Link from "next/link";
import {
  Activity,
  Route,
  Train,
  Bus,
  Fuel,
  Info,
  type LucideIcon,
} from "lucide-react";

type GridColumn = {
  title: string;
  icon: LucideIcon;
  links: { name: string; href: string }[];
};

const GRID_COLUMNS: GridColumn[] = [
  {
    title: "Tráfico",
    icon: Activity,
    links: [
      { name: "Mapa en vivo", href: "/mapa" },
      { name: "Atascos", href: "/atascos" },
      { name: "Incidencias", href: "/incidencias" },
      { name: "Cámaras DGT", href: "/camaras" },
      { name: "Operativos DGT", href: "/operaciones" },
      { name: "Alertas AEMET", href: "/alertas-meteo" },
    ],
  },
  {
    title: "Carreteras",
    icon: Route,
    links: [
      { name: "Autopistas", href: "/carreteras/autopistas" },
      { name: "Autovías", href: "/carreteras/autovias" },
      { name: "Por carretera", href: "/carreteras" },
      { name: "Radares", href: "/radares" },
      { name: "Peajes", href: "/peajes" },
      { name: "Rondas urbanas", href: "/rondas" },
    ],
  },
  {
    title: "Trenes",
    icon: Train,
    links: [
      { name: "Mapa en directo", href: "/trenes" },
      { name: "Cercanías Madrid", href: "/trenes/cercanias/madrid" },
      { name: "Cercanías BCN", href: "/trenes/cercanias/barcelona" },
      { name: "Líneas AVE", href: "/trenes/lineas" },
      { name: "Estaciones", href: "/trenes/estaciones" },
      { name: "Incidencias Renfe", href: "/trenes/incidencias" },
    ],
  },
  {
    title: "Otros",
    icon: Bus,
    links: [
      { name: "Marítimo", href: "/maritimo" },
      { name: "Aviación", href: "/aviacion" },
      { name: "Transp. público", href: "/transporte-publico" },
      { name: "Calidad del aire", href: "/calidad-aire" },
      { name: "Clima AEMET", href: "/clima" },
      { name: "Estadísticas", href: "/estadisticas-transporte" },
    ],
  },
  {
    title: "Combustible",
    icon: Fuel,
    links: [
      { name: "Gasolina hoy", href: "/precio-gasolina-hoy" },
      { name: "Diésel hoy", href: "/precio-diesel-hoy" },
      { name: "24 horas", href: "/gasolineras-24-horas" },
      { name: "Cerca de mí", href: "/gasolineras/cerca" },
      { name: "Cargadores EV", href: "/carga-ev" },
      { name: "Calculadora", href: "/calculadora" },
    ],
  },
  {
    title: "Sobre",
    icon: Info,
    links: [
      { name: "Sobre nosotros", href: "/sobre" },
      { name: "API", href: "/api-docs" },
      { name: "Citaciones IA", href: "/citaciones-ia" },
      { name: "Posicionamiento", href: "/posicionamiento" },
      { name: "Contacto", href: "/contacto" },
      { name: "API docs", href: "/api-docs#referencia" },
    ],
  },
];

export function FooterGrid() {
  return (
    <div className="w-full bg-ink-950 dark:bg-gray-950 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-x-6 gap-y-10">
          {GRID_COLUMNS.map((col) => {
            const Icon = col.icon;
            return (
              <div key={col.title}>
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white mb-4 font-heading">
                  <Icon className="w-3.5 h-3.5 text-tl-300 shrink-0" aria-hidden="true" />
                  {col.title}
                </h3>
                <ul className="space-y-0.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/80 hover:text-white block py-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-400 rounded"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
