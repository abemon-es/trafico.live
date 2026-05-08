"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

const CAL_BASE = "https://cal.trafico.live";

const departments = [
  {
    slug: "datos",
    name: "Datos & API",
    icon: "📊",
    desc: "Acceso a tráfico, accidentes, regulación",
  },
  {
    slug: "comercial",
    name: "Comercial & Sponsors",
    icon: "🤝",
    desc: "Acuerdos, sponsors, partnerships",
  },
];

const durations = [
  { label: "15 min", value: "15min" },
  { label: "30 min", value: "30min" },
  { label: "60 min", value: "60min" },
];

export default function CalendarioPage() {
  const [activeDept, setActiveDept] = useState(departments[0].slug);
  const [activeDur, setActiveDur] = useState(durations[1].value);

  const calSrc = `${CAL_BASE}/t/${activeDept}/${activeDur}?embed=1`;

  return (
    <main
      className="min-h-screen bg-white dark:bg-gray-950"
      style={{ fontFamily: "'Exo 2', sans-serif" }}
    >
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
          style={{ backgroundColor: "#1b4bd5" }}
        >
          <Calendar className="w-7 h-7 text-white" aria-hidden="true" />
        </div>

        <h1
          className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          Reserva una reunión
        </h1>

        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
          Elige el área con la que quieres hablar y la duración que prefieras.
        </p>
      </section>

      {/* Dual-column layout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* LEFT — department selector + duration pills + booking iframe */}
          <div className="flex flex-col gap-6">

            {/* Department cards */}
            <div className="flex flex-col gap-3" role="group" aria-label="Departamento">
              {departments.map((dept) => {
                const active = activeDept === dept.slug;
                return (
                  <button
                    key={dept.slug}
                    type="button"
                    onClick={() => setActiveDept(dept.slug)}
                    aria-pressed={active}
                    className={`
                      flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
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
                    <span className="text-2xl" aria-hidden="true">{dept.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{dept.name}</div>
                      <div
                        className={`text-xs mt-0.5 ${active ? "text-blue-100" : "text-gray-400 dark:text-gray-500"}`}
                      >
                        {dept.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Duration pills */}
            <div
              className="flex flex-wrap gap-3"
              role="group"
              aria-label="Duración de la reunión"
            >
              {durations.map(({ label, value }) => {
                const active = activeDur === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveDur(value)}
                    aria-pressed={active}
                    className={`
                      px-5 py-2.5 rounded-full border text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
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
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Booking iframe */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
              <iframe
                key={calSrc}
                src={calSrc}
                style={{ width: "100%", height: "640px", border: "none" }}
                title={`Reserva con ${departments.find((d) => d.slug === activeDept)?.name ?? activeDept} — ${activeDur}`}
                loading="lazy"
              />
            </div>
          </div>

          {/* RIGHT — contact form iframe */}
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className="text-xl font-bold text-gray-900 dark:text-white mb-1"
                style={{ fontFamily: "'Exo 2', sans-serif" }}
              >
                ¿Prefieres dejarnos un mensaje?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Rellena el formulario y te contactamos en menos de 24 h.
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
              <iframe
                src={`${CAL_BASE}/contact?embed=1`}
                style={{ width: "100%", height: "720px", border: "none" }}
                title="Formulario de contacto"
                loading="lazy"
              />
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
