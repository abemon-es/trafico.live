"use client";

import { ExternalLink } from "lucide-react";

export interface PartnerRow {
  id: string;
  name: string;
  category: string;
  clicks7d: number;
  clicks30d: number;
  conversions: number;
  epc: number;
  revenueEur: number;
  status: "pendiente" | "activo" | "pausado";
}

interface PartnerTableProps {
  partners: PartnerRow[];
}

const STATUS_STYLES: Record<PartnerRow["status"], string> = {
  pendiente:
    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  activo:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  pausado:
    "bg-tl-amber-100 text-tl-amber-600 dark:bg-tl-amber-900/40 dark:text-tl-amber-300",
};

const PARTNER_URLS: Record<string, string> = {
  skyscanner: "https://www.skyscanner.es",
  trainline: "https://www.thetrainline.com",
  directferries: "https://www.directferries.es",
  flixbus: "https://www.flixbus.es",
  awin: "https://www.awin.com",
  rakuten: "https://rakutenadvertising.com",
};

export function PartnerTable({ partners }: PartnerTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="text-left py-3 pr-4 font-semibold text-gray-600 dark:text-gray-400">
              Partner
            </th>
            <th className="text-left py-3 pr-4 font-semibold text-gray-600 dark:text-gray-400">
              Categoría
            </th>
            <th className="text-right py-3 pr-4 font-semibold text-gray-600 dark:text-gray-400">
              Clicks 7d
            </th>
            <th className="text-right py-3 pr-4 font-semibold text-gray-600 dark:text-gray-400">
              Clicks 30d
            </th>
            <th className="text-right py-3 pr-4 font-semibold text-gray-600 dark:text-gray-400">
              Conv.
            </th>
            <th className="text-right py-3 pr-4 font-semibold text-gray-600 dark:text-gray-400 font-mono">
              EPC €
            </th>
            <th className="text-right py-3 pr-4 font-semibold text-gray-600 dark:text-gray-400 font-mono">
              Ingresos €
            </th>
            <th className="text-left py-3 font-semibold text-gray-600 dark:text-gray-400">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {partners.map((p) => (
            <tr
              key={p.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold font-heading text-gray-900 dark:text-gray-100">
                    {p.name}
                  </span>
                  {PARTNER_URLS[p.id] && (
                    <a
                      href={PARTNER_URLS[p.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir ${p.name}`}
                      className="text-gray-400 hover:text-tl-600 dark:hover:text-tl-400"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </td>
              <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 capitalize">
                {p.category}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-gray-700 dark:text-gray-300">
                {p.clicks7d.toLocaleString("es-ES")}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-gray-700 dark:text-gray-300">
                {p.clicks30d.toLocaleString("es-ES")}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-gray-700 dark:text-gray-300">
                {p.conversions.toLocaleString("es-ES")}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-gray-700 dark:text-gray-300">
                {p.epc.toFixed(3)}
              </td>
              <td className="py-3 pr-4 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                {p.revenueEur.toFixed(2)}
              </td>
              <td className="py-3">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status]}`}
                >
                  {p.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
