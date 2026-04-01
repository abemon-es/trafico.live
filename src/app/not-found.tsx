import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-heading font-bold text-tl-600 mb-4">404</p>
        <h1 className="font-heading text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Página no encontrada
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          La página que buscas no existe o ha sido movida.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-tl-600 hover:bg-tl-700 text-white font-medium rounded-lg transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            href="/incidencias"
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            Incidencias
          </Link>
        </div>
      </div>
    </main>
  );
}
