"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin } from "lucide-react";

const CITIES = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Málaga", slug: "malaga" },
  { name: "Murcia", slug: "murcia" },
  { name: "Palma de Mallorca", slug: "palma" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Alicante", slug: "alicante" },
  { name: "Córdoba", slug: "cordoba" },
  { name: "Valladolid", slug: "valladolid" },
  { name: "Vigo", slug: "vigo" },
  { name: "Gijón", slug: "gijon" },
  { name: "Granada", slug: "granada" },
  { name: "Vitoria", slug: "vitoria" },
  { name: "Oviedo", slug: "oviedo" },
  { name: "San Sebastián", slug: "san-sebastian" },
  { name: "Santander", slug: "santander" },
  { name: "Pamplona", slug: "pamplona" },
  { name: "Las Palmas", slug: "las-palmas" },
  { name: "Santa Cruz de Tenerife", slug: "santa-cruz" },
  { name: "A Coruña", slug: "a-coruna" },
];

// Normalize for accent-insensitive matching
function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function CityQuickSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered =
    query.length > 0
      ? CITIES.filter((c) => normalize(c.name).includes(normalize(query))).slice(0, 5)
      : [];

  const showDropdown = focused && query.length > 0;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect() {
    setQuery("");
    setFocused(false);
  }

  return (
    <div ref={wrapperRef} className="relative mt-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Buscar ciudad..."
          className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-tl-300 dark:focus:ring-tl-700 transition-colors"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
          {filtered.length > 0 ? (
            <>
              {filtered.map((city) => (
                <Link
                  key={city.slug}
                  href={`/trafico/${city.slug}`}
                  prefetch={false}
                  onClick={handleSelect}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-tl-50 dark:hover:bg-tl-900/20 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium">{city.name}</span>
                </Link>
              ))}
              <button
                onClick={handleSelect}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:text-tl-600 dark:hover:text-tl-400 transition-colors border-t border-gray-100 dark:border-gray-800"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Buscar &ldquo;{query}&rdquo; en todo el sitio →
                </span>
              </button>
            </>
          ) : (
            <button
              onClick={handleSelect}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>
                Buscar &ldquo;{query}&rdquo; en todo el sitio →
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
