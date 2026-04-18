"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowRight } from "lucide-react";
import { slugifyCity } from "@/lib/ir-slug";

interface ODInputProps {
  defaultOrigin?: string;
  defaultDest?: string;
}

/**
 * Origin / destination input pair.
 * On submit redirects to /ir/[originSlug]/[destSlug].
 *
 * TODO(S4-T1.9): Add autocomplete backed by Typesense city collection.
 */
export function ODInput({ defaultOrigin = "", defaultDest = "" }: ODInputProps) {
  const router = useRouter();
  const [origin, setOrigin] = useState(defaultOrigin);
  const [dest, setDest] = useState(defaultDest);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const o = origin.trim();
    const d = dest.trim();

    if (!o || !d) {
      setError("Introduce origen y destino.");
      return;
    }
    if (o.toLowerCase() === d.toLowerCase()) {
      setError("El origen y el destino no pueden ser iguales.");
      return;
    }

    setError(null);
    // TODO(S4-T1.9): Validate against /api/ir to resolve free-text → slug before push.
    router.push(`/ir/${slugifyCity(o)}/${slugifyCity(d)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
      <div className="relative flex-1">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tl-400 pointer-events-none"
          aria-hidden
        />
        <input
          type="text"
          aria-label="Ciudad de origen"
          placeholder="Origen — p. ej. Madrid"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-lg border border-tl-200 dark:border-tl-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-500 transition text-sm"
        />
      </div>

      <div className="relative flex-1">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tl-600 dark:text-tl-400 pointer-events-none"
          aria-hidden
        />
        <input
          type="text"
          aria-label="Ciudad de destino"
          placeholder="Destino — p. ej. Barcelona"
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-lg border border-tl-200 dark:border-tl-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-500 transition text-sm"
        />
      </div>

      <button
        type="submit"
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-tl-600 hover:bg-tl-700 text-white font-semibold text-sm transition whitespace-nowrap"
      >
        Buscar ruta
        <ArrowRight className="w-4 h-4" aria-hidden />
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 sm:col-span-3">
          {error}
        </p>
      )}
    </form>
  );
}
