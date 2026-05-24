import { ShieldCheck } from "lucide-react";

const DATA_SOURCES = [
  "DGT",
  "AEMET",
  "Renfe",
  "AENA",
  "MITECO",
  "Puertos del Estado",
  "MobilityData",
  "OpenSky",
  "aisstream.io",
  "INE",
  "CNMC",
];

export function TrustStrip() {
  return (
    <div className="w-full bg-ink-900 dark:bg-gray-900 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <div className="flex items-center gap-1.5 shrink-0 mr-1">
            <ShieldCheck
              className="w-3.5 h-3.5 text-tl-400 shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs font-semibold text-white/50 font-heading uppercase tracking-wide">
              Datos oficiales de:
            </span>
          </div>
          {DATA_SOURCES.map((src, idx) => (
            <span key={src} className="inline-flex items-center">
              <span className="text-xs text-white/60 font-data">{src}</span>
              {idx < DATA_SOURCES.length - 1 && (
                <span
                  className="text-white/25 mx-1.5 select-none"
                  aria-hidden="true"
                >
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
