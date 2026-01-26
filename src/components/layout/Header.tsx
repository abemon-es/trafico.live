"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Map,
  BarChart3,
  Info,
  Menu,
  X,
  Home,
  Route,
  AlertTriangle,
  Camera,
  ChevronDown,
  MapPin,
  Fuel,
  Zap,
  Radar,
  Ban,
  Building2,
  MapPinned,
  Search,
  Truck,
} from "lucide-react";

// Primary navigation - main sections (visible in navbar)
const navigation = [
  { name: "Inicio", href: "/", icon: Home },
  { name: "Mapa", href: "/mapa", icon: Map },
  { name: "Carreteras", href: "/carreteras", icon: Route },
  { name: "Combustible", href: "/gasolineras", icon: Fuel },
  { name: "Alertas", href: "/incidencias", icon: AlertTriangle },
];

// Mega menu categories
const megaMenuCategories = [
  {
    title: "TIEMPO REAL",
    items: [
      { name: "Cámaras de tráfico", href: "/camaras", icon: Camera },
      { name: "Mapa en vivo", href: "/", icon: Map },
    ],
  },
  {
    title: "INFRAESTRUCTURA",
    items: [
      { name: "Cargadores eléctricos", href: "/carga-ev", icon: Zap },
      { name: "Radares", href: "/explorar/infraestructura", icon: Radar },
      { name: "Zonas bajas emisiones", href: "/explorar/infraestructura", icon: Ban },
    ],
  },
  {
    title: "EXPLORAR POR ZONA",
    items: [
      { name: "Comunidades", href: "/comunidad-autonoma", icon: Building2 },
      { name: "Provincias", href: "/espana", icon: MapPinned },
      { name: "Buscar mi ciudad", href: "/ciudad", icon: Search },
    ],
  },
  {
    title: "DATOS",
    items: [
      { name: "Estadísticas", href: "/estadisticas", icon: BarChart3 },
      { name: "Profesional", href: "/profesional", icon: Truck },
      { name: "Sobre nosotros", href: "/sobre", icon: Info },
    ],
  },
];

// All dropdown items flattened for mobile and active route checking
const allMegaMenuItems = megaMenuCategories.flatMap((cat) => cat.items);

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target as Node)) {
        setMegaMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mega menu on route change
  useEffect(() => {
    setMegaMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Check if path matches (exact or starts with for nested routes)
  const isActiveRoute = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Check if any mega menu item is active
  const isMegaMenuActive = allMegaMenuItems.some((item) => isActiveRoute(item.href));

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-logistics.png"
              alt="Logistics Express"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
            <div className="border-l border-gray-300 pl-3">
              <span className="text-lg font-bold text-gray-900">
                Tráfico España
              </span>
              <span className="hidden sm:block text-xs text-gray-500">
                Inteligencia Vial en Tiempo Real
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "bg-[#e8f5e9] text-[#006633]"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}

            {/* Mega Menu dropdown */}
            <div className="relative" ref={megaMenuRef}>
              <button
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                className={`
                  flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    isMegaMenuActive || megaMenuOpen
                      ? "bg-[#e8f5e9] text-[#006633]"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                Más
                <ChevronDown className={`w-4 h-4 transition-transform ${megaMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {megaMenuOpen && (
                <div className="absolute right-0 mt-2 w-[500px] bg-white rounded-lg shadow-xl border border-gray-200 py-4 px-4 z-50">
                  <div className="grid grid-cols-2 gap-6">
                    {megaMenuCategories.map((category) => (
                      <div key={category.title}>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                          {category.title}
                        </h3>
                        <ul className="space-y-1">
                          {category.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = isActiveRoute(item.href);

                            return (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  className={`
                                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                                    ${
                                      isActive
                                        ? "bg-[#e8f5e9] text-[#006633]"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }
                                  `}
                                >
                                  <Icon className="w-4 h-4" />
                                  {item.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col gap-1">
              {/* Main navigation */}
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? "bg-[#e8f5e9] text-[#006633]"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}

              {/* Mega menu categories in mobile */}
              {megaMenuCategories.map((category) => (
                <div key={category.title}>
                  <div className="my-2 border-t border-gray-200" />
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {category.title}
                  </p>
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                          ${
                            isActive
                              ? "bg-[#e8f5e9] text-[#006633]"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
