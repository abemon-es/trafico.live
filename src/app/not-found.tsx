import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  Fuel,
  Train,
  Wind,
  Map as MapIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description:
    "La página que buscas no existe o se ha movido. Consulta los hubs principales de trafico.live.",
  robots: { index: false, follow: true },
};

const SECTIONS: Array<{
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}> = [
  {
    href: "/trafico",
    icon: <AlertTriangle className="w-5 h-5" aria-hidden />,
    title: "Tráfico en tiempo real",
    subtitle: "Incidencias, cámaras, paneles, radares DGT",
  },
  {
    href: "/gasolineras",
    icon: <Fuel className="w-5 h-5" aria-hidden />,
    title: "Gasolineras y combustible",
    subtitle: "Precios CNMC actualizados, 11 000 estaciones",
  },
  {
    href: "/trenes",
    icon: <Train className="w-5 h-5" aria-hidden />,
    title: "Trenes",
    subtitle: "Cercanías, AVE y alertas Renfe en vivo",
  },
  {
    href: "/clima",
    icon: <Activity className="w-5 h-5" aria-hidden />,
    title: "Clima y alertas AEMET",
    subtitle: "Avisos meteorológicos activos por provincia",
  },
  {
    href: "/calidad-aire",
    icon: <Wind className="w-5 h-5" aria-hidden />,
    title: "Calidad del aire",
    subtitle: "Índice ICA MITECO · 565 estaciones",
  },
  {
    href: "/mapa",
    icon: <MapIcon className="w-5 h-5" aria-hidden />,
    title: "Mapa interactivo",
    subtitle: "Visión multimodal completa",
  },
];

export default function NotFound() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <p className="font-heading text-6xl sm:text-7xl font-bold text-tl-600 dark:text-tl-400">
          404
        </p>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
          Esta ruta no existe
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          La página se ha movido, el enlace ha caducado o nunca existió. Te
          dejamos los accesos más usados de trafico.live para que sigas
          explorando.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="px-5 py-2.5 bg-tl-600 hover:bg-tl-700 text-white font-medium rounded-lg transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            href="/incidencias"
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
          >
            Incidencias activas
          </Link>
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="group block h-full p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-2 text-tl-600 dark:text-tl-400">
                {section.icon}
                <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400">
                  {section.title}
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {section.subtitle}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        ¿Crees que es un error? Escríbenos a{" "}
        <a
          href="mailto:hola@trafico.live"
          className="underline hover:text-tl-600 dark:hover:text-tl-400"
        >
          hola@trafico.live
        </a>
        .
      </p>
    </main>
  );
}
