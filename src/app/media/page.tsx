import { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Download, Copy, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Media Kit — Brand Assets & Guidelines",
  description:
    "Descarga los assets oficiales de trafico.live: logotipo, icono, paleta de colores, tipografía y guía de uso de marca.",
  alternates: { canonical: "https://trafico.live/media" },
};

const COLORS = {
  blue: [
    { step: "50", hex: "#f0f5ff" },
    { step: "100", hex: "#dde8ff" },
    { step: "200", hex: "#c0d5ff" },
    { step: "300", hex: "#94b6ff" },
    { step: "400", hex: "#6393ff" },
    { step: "500", hex: "#366cf8" },
    { step: "600", hex: "#1b4bd5", label: "Primary" },
    { step: "700", hex: "#092ea8" },
    { step: "800", hex: "#011577" },
    { step: "900", hex: "#000245" },
    { step: "950", hex: "#000025" },
  ],
  amber: [
    { step: "50", hex: "#fff3ea" },
    { step: "100", hex: "#ffe2cc" },
    { step: "200", hex: "#fcc8a1" },
    { step: "300", hex: "#eca66e" },
    { step: "400", hex: "#d48139" },
    { step: "500", hex: "#b56200", label: "Accent" },
    { step: "600", hex: "#8c4a00" },
    { step: "700", hex: "#653400" },
  ],
  signal: [
    { name: "Red", hex: "#dc2626", meaning: "Incidents, danger" },
    { name: "Amber", hex: "#d97706", meaning: "Warnings, works" },
    { name: "Green", hex: "#059669", meaning: "Flowing, success" },
  ],
};

const ASSETS = [
  {
    name: "Icon — 3 Puntos",
    file: "/brand-kit/assets/icon-3puntos.svg",
    desc: "Primary icon, transparent background",
  },
  {
    name: "Icon — Dark mode",
    file: "/brand-kit/assets/icon-3puntos-dark.svg",
    desc: "Elevated colors for dark backgrounds",
  },
  {
    name: "App Icon",
    file: "/brand-kit/assets/app-icon.svg",
    desc: "Pastel dots on blue rounded rectangle",
  },
  {
    name: "Icon on Blue",
    file: "/brand-kit/assets/icon-on-blue.svg",
    desc: "For brand blue backgrounds",
  },
  {
    name: "CSS Tokens",
    file: "/brand-kit/tokens.css",
    desc: "Complete design token system",
  },
  {
    name: "Brand Guide",
    file: "/brand-kit/brand-guide.html",
    desc: "Interactive visual brand guide",
  },
];

function ColorSwatch({ hex, step, label }: { hex: string; step: string; label?: string }) {
  const isDark = parseInt(step) >= 500;
  return (
    <div
      className="flex flex-col items-center justify-center py-3 px-1 min-w-0"
      style={{ backgroundColor: hex }}
    >
      <span
        className="font-data text-[10px]"
        style={{ color: isDark ? "#fff" : "#111827", opacity: 0.7 }}
      >
        {step}
      </span>
      {label && (
        <span
          className="font-data text-[8px] mt-0.5"
          style={{ color: isDark ? "#fff" : "#111827" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default function MediaPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Logo variant="stacked" size="lg" href={undefined} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Media Kit</h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Assets oficiales, gu&iacute;a de marca y recursos descargables para prensa,
            partners y desarrolladores.
          </p>
        </div>

        {/* Downloads */}
        <section className="mb-16" aria-labelledby="downloads">
          <h2 id="downloads" className="text-xl font-bold text-gray-900 mb-6">
            Descargas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ASSETS.map((asset) => (
              <a
                key={asset.file}
                href={asset.file}
                download
                className="group bg-white border border-gray-200 rounded-lg p-4 hover:border-tl-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-tl-600 transition-colors">
                    {asset.name}
                  </h3>
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-tl-600 transition-colors flex-shrink-0" />
                </div>
                <p className="text-xs text-gray-500">{asset.desc}</p>
                <span className="inline-block mt-2 text-[10px] font-data text-gray-400">
                  {asset.file.split("/").pop()}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Logo Usage */}
        <section className="mb-16" aria-labelledby="logo-usage">
          <h2 id="logo-usage" className="text-xl font-bold text-gray-900 mb-6">
            Logotipo
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="border border-gray-200 rounded-lg p-6 flex items-center justify-center bg-white">
              <Logo variant="horizontal" size="md" href={undefined} />
            </div>
            <div className="border border-gray-200 rounded-lg p-6 flex items-center justify-center bg-white">
              <Logo variant="inline" size="md" href={undefined} />
            </div>
            <div className="border border-gray-200 rounded-lg p-6 flex items-center justify-center bg-white">
              <Logo variant="icon" size="lg" href={undefined} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="border border-gray-800 rounded-lg p-6 flex items-center justify-center bg-[#0b0f1a]">
              <Logo variant="horizontal" size="md" theme="dark" href={undefined} />
            </div>
            <div className="border border-gray-800 rounded-lg p-6 flex items-center justify-center bg-[#0b0f1a]">
              <Logo variant="inline" size="md" theme="dark" href={undefined} />
            </div>
            <div className="border border-gray-800 rounded-lg p-6 flex items-center justify-center bg-[#0b0f1a]">
              <Logo variant="icon" size="lg" theme="dark" href={undefined} />
            </div>
          </div>

          {/* Rules */}
          <div className="bg-tl-50 border border-tl-200 rounded-lg p-5">
            <h3 className="font-semibold text-tl-800 mb-3 text-sm">Reglas de uso</h3>
            <ul className="text-sm text-tl-700 space-y-1.5">
              <li>&bull; Siempre: rojo arriba, &aacute;mbar centro, verde abajo</li>
              <li>&bull; Nunca usar un solo color para los 3 puntos</li>
              <li>&bull; Nunca invertir el orden de los colores</li>
              <li>&bull; &ldquo;.LIVE&rdquo; siempre dentro del badge azul con punto blanco</li>
              <li>&bull; Espacio libre m&iacute;nimo: 1 di&aacute;metro de punto en todos los lados</li>
              <li>&bull; &ldquo;trafico&rdquo; siempre en min&uacute;scula</li>
            </ul>
          </div>
        </section>

        {/* Colors */}
        <section className="mb-16" aria-labelledby="colors">
          <h2 id="colors" className="text-xl font-bold text-gray-900 mb-6">
            Colores
          </h2>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Signal Blue — Primary</h3>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {COLORS.blue.map((c) => (
                <ColorSwatch key={c.step} hex={c.hex} step={c.step} label={c.label} />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Signal Amber — Accent</h3>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {COLORS.amber.map((c) => (
                <ColorSwatch key={c.step} hex={c.hex} step={c.step} label={c.label} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Signal Colors (Icon)</h3>
            <div className="flex gap-3">
              {COLORS.signal.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div>
                    <span className="font-data text-xs text-gray-900">{c.hex}</span>
                    <span className="text-xs text-gray-500 ml-1.5">{c.meaning}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16" aria-labelledby="typography">
          <h2 id="typography" className="text-xl font-bold text-gray-900 mb-6">
            Tipograf&iacute;a
          </h2>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-5">
              <span className="text-[10px] font-data text-tl-600 uppercase tracking-wider">Headings</span>
              <div className="mt-2" style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "32px", letterSpacing: "-0.5px" }}>
                Exo 2 — 800
              </div>
              <p className="text-xs text-gray-500 mt-1">Weights: 500, 600, 700, 800</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-5">
              <span className="text-[10px] font-data text-tl-600 uppercase tracking-wider">Body</span>
              <div className="mt-2 text-lg">DM Sans — Regular</div>
              <p className="text-xs text-gray-500 mt-1">Weights: 400, 500, 600</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-5">
              <span className="text-[10px] font-data text-tl-600 uppercase tracking-wider">Data</span>
              <div className="mt-2 font-data text-2xl text-tl-600">1.284 &euro; &middot; 40.4168&deg;N</div>
              <p className="text-xs text-gray-500 mt-1">JetBrains Mono — 400, 500 — tabular-nums</p>
            </div>
          </div>
        </section>

        {/* Quick Reference */}
        <section className="mb-16" aria-labelledby="reference">
          <h2 id="reference" className="text-xl font-bold text-gray-900 mb-6">
            Referencia r&aacute;pida
          </h2>

          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-700 bg-gray-50 w-40">Nombre</td>
                  <td className="px-4 py-3">trafico.live (siempre min&uacute;scula)</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-700 bg-gray-50">Tagline</td>
                  <td className="px-4 py-3">Inteligencia vial en tiempo real</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-700 bg-gray-50">Primary color</td>
                  <td className="px-4 py-3 font-data">#1b4bd5</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-700 bg-gray-50">Accent color</td>
                  <td className="px-4 py-3 font-data">#b56200</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-700 bg-gray-50">Heading font</td>
                  <td className="px-4 py-3">Exo 2</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-700 bg-gray-50">Body font</td>
                  <td className="px-4 py-3">DM Sans</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-700 bg-gray-50">Data font</td>
                  <td className="px-4 py-3">JetBrains Mono</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact */}
        <section className="text-center">
          <p className="text-sm text-gray-500">
            &iquest;Necesitas otros formatos o tienes dudas sobre el uso de la marca?
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Contacta con nosotros en{" "}
            <a href="mailto:media@trafico.live" className="text-tl-600 hover:underline">
              media@trafico.live
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
