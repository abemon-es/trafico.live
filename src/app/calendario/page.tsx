"use client";

import { useState } from "react";
import { Calendar, Clock, Video } from "lucide-react";

const EVENT_TYPES = [
  {
    slug: "mj/15min",
    label: "15 min",
    description: "Consulta rápida",
    icon: Clock,
  },
  {
    slug: "mj/30min",
    label: "30 min",
    description: "Demo o análisis",
    icon: Video,
  },
  {
    slug: "mj/60min",
    label: "60 min",
    description: "Sesión en profundidad",
    icon: Calendar,
  },
];

const CAL_BASE = "https://cal.trafico.live";

export default function CalendarioPage() {
  const [activeSlug, setActiveSlug] = useState(EVENT_TYPES[1].slug);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
            style={{ backgroundColor: "#1b4bd5" }}
          >
            <Calendar className="w-7 h-7 text-white" aria-hidden="true" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold font-heading text-gray-900 dark:text-white tracking-tight mb-4">
            Reserva una reunión
          </h1>

          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            Datos de tráfico, accidentes, regulación. Elige duración y horario.
          </p>
        </section>

        {/* Event-type pills */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div
            className="flex flex-wrap justify-center gap-3"
            role="group"
            aria-label="Duración de la reunión"
          >
            {EVENT_TYPES.map(({ slug, label, description, icon: Icon }) => {
              const active = activeSlug === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setActiveSlug(slug)}
                  aria-pressed={active}
                  className={`
                    flex items-center gap-2.5 px-5 py-3 rounded-full border text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                    ${
                      active
                        ? "text-white border-transparent shadow-md"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    }
                  `}
                  style={
                    active
                      ? { backgroundColor: "#1b4bd5", outlineColor: "#1b4bd5" }
                      : { outlineColor: "#1b4bd5" }
                  }
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{label}</span>
                  <span
                    className={`hidden sm:inline text-xs font-normal opacity-80 ${active ? "text-white" : "text-gray-400 dark:text-gray-500"}`}
                  >
                    &mdash; {description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Cal embed */}
        <section
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
          aria-label="Calendario de reservas"
        >
          <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <iframe
              key={activeSlug}
              src={`${CAL_BASE}/${activeSlug}?embed=true`}
              style={{ width: "100%", height: "700px", border: "none" }}
              title={`Reserva ${EVENT_TYPES.find((e) => e.slug === activeSlug)?.label ?? ""}`}
              loading="lazy"
            />
          </div>
        </section>
    </main>
  );
}
