"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="font-heading text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Algo ha fallado
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Ha ocurrido un error inesperado. Puedes intentar recargar la página.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-tl-600 hover:bg-tl-700 text-white font-medium rounded-lg transition-colors"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
