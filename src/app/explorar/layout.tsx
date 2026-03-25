"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Route, Building2 } from "lucide-react";

const tabs = [
  {
    id: "territorios",
    label: "Territorios",
    href: "/explorar/territorios",
    icon: MapPin,
    description: "Comunidades, provincias y municipios",
  },
  {
    id: "carreteras",
    label: "Carreteras",
    href: "/explorar/carreteras",
    icon: Route,
    description: "Índice de carreteras por tipo",
  },
  {
    id: "infraestructura",
    label: "Infraestructura",
    href: "/explorar/infraestructura",
    icon: Building2,
    description: "Cámaras, radares, cargadores y ZBE",
  },
];

export default function ExplorarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Determine active tab from pathname
  const getActiveTab = () => {
    if (pathname.startsWith("/explorar/carreteras")) return "carreteras";
    if (pathname.startsWith("/explorar/infraestructura")) return "infraestructura";
    return "territorios"; // default
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page title */}
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Explorar</h1>
            <p className="mt-1 text-sm text-gray-500">
              Explora el tráfico en España por territorios, carreteras e infraestructura
            </p>
          </div>

          {/* Tab navigation */}
          <nav className="flex space-x-1 -mb-px" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`
                    group flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                    ${isActive
                      ? "border-tl-500 text-tl-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-tl-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
