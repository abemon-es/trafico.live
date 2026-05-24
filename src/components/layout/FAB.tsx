"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Map } from "lucide-react";

export function MapaFAB() {
  const pathname = usePathname();
  if (pathname === "/mapa" || pathname.startsWith("/mapa/")) return null;
  return (
    <Link
      href="/mapa"
      aria-label="Ver mapa en vivo"
      className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 rounded-full bg-tl-600 hover:bg-tl-700 text-white font-semibold px-5 py-3 shadow-lg shadow-tl-600/30"
    >
      <Map className="w-4 h-4" aria-hidden="true" />
      Ver mapa en vivo
    </Link>
  );
}
