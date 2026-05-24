import Link from "next/link";
import { Map, Cloud, AlertTriangle, Train, Fuel, Calendar } from "lucide-react";
import db from "@/lib/db";

export const revalidate = 300;

// ─── Seasonal operative helper ───────────────────────────────────────────────

type Operative = {
  slug: string;
  label: string;
  href: string;
};

/**
 * Easter Sunday (Gregorian) using the Anonymous Gregorian algorithm.
 * Returns a Date in UTC.
 */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function getOperative(now: Date): Operative {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-12
  const day = now.getUTCDate();

  // December → Navidad
  if (month === 12) {
    return { slug: "navidad", label: "Operativo Navidad", href: "/operativos/navidad" };
  }

  // January → Navidad (Three Kings wrap-up, ends Jan 6)
  if (month === 1) {
    return { slug: "navidad", label: "Operativo Navidad", href: "/operativos/navidad" };
  }

  // Semana Santa window: Holy Week (Palm Sunday to Easter Sunday inclusive)
  // Palm Sunday = Easter - 7 days; we show from Palm Sunday -3 to Easter +1
  const easter = easterSunday(year);
  const palmSunday = new Date(easter.getTime() - 7 * 86400000);
  const semanaStart = new Date(palmSunday.getTime() - 3 * 86400000); // Wed before Palm
  const semanaEnd = new Date(easter.getTime() + 86400000);           // Easter Mon
  const nowUTC = new Date(Date.UTC(year, month - 1, day));

  if (nowUTC >= semanaStart && nowUTC <= semanaEnd) {
    return { slug: "semana-santa", label: "Operativo Semana Santa", href: "/operativos/semana-santa" };
  }

  // Puente de Mayo: late April through mid-May
  if ((month === 4 && day >= 25) || (month === 5 && day <= 12)) {
    return { slug: "puente-mayo", label: "Puente de Mayo", href: "/operativos/puente-mayo" };
  }

  // Summer: June through September
  if (month >= 6 && month <= 9) {
    return { slug: "verano", label: "Operativo Verano", href: "/operativos/verano" };
  }

  // October–November → Todos los Santos
  if (month === 10 || month === 11) {
    return { slug: "todos-los-santos", label: "Puente Nov.", href: "/operativos/todos-los-santos" };
  }

  // February–March outside Semana Santa → next upcoming operative (Semana Santa)
  return { slug: "semana-santa", label: "Operativo Semana Santa", href: "/operativos/semana-santa" };
}

// ─── Fallback road rotation ───────────────────────────────────────────────────

const TOP_ROADS = [
  { label: "AP-7", href: "/carreteras/ap-7" },
  { label: "A-1", href: "/carreteras/a-1" },
  { label: "A-3", href: "/carreteras/a-3" },
  { label: "A-92", href: "/carreteras/a-92" },
];

function getRotatingRoad(now: Date) {
  // Deterministic rotation by day-of-year so it's stable per SSR window
  const doy = Math.floor(
    (now.getTime() - new Date(now.getUTCFullYear(), 0, 0).getTime()) / 86400000
  );
  return TOP_ROADS[doy % TOP_ROADS.length];
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchAlertCounts(): Promise<{ aemet: number; renfe: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const timeout = new Promise<{ aemet: number; renfe: number }>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 5000)
  );

  const query = Promise.all([
    db.weatherAlert.count({
      where: { isActive: true, fetchedAt: { gte: since } },
    }),
    db.railwayAlert.count({
      where: { isActive: true, fetchedAt: { gte: since } },
    }),
  ]).then(([aemet, renfe]) => ({ aemet, renfe }));

  return Promise.race([query, timeout]).catch(() => ({ aemet: 0, renfe: 0 }));
}

// ─── Pill sub-component ───────────────────────────────────────────────────────

type PillProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
};

function Pill({ href, icon, label, highlight }: PillProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600 focus-visible:ring-offset-1",
        highlight
          ? "bg-tl-amber-100 text-tl-amber-700 hover:bg-tl-amber-200 dark:bg-tl-amber-900/40 dark:text-tl-amber-300 dark:hover:bg-tl-amber-900/60"
          : "bg-zinc-100 text-ink-700 hover:bg-tl-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-tl-950/40",
      ].join(" ")}
    >
      {icon}
      {label}
    </Link>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export async function ContextStrip() {
  const now = new Date();
  const operative = getOperative(now);
  const road = getRotatingRoad(now);
  const { aemet, renfe } = await fetchAlertCounts();

  return (
    <nav
      aria-label="Atajos contextuales"
      className="border-b border-ink-100 bg-white dark:bg-gray-950 dark:border-gray-800/60"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex gap-2 py-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {/* Always: Mapa en vivo */}
          <Pill
            href="/"
            icon={<Map className="w-3.5 h-3.5" aria-hidden="true" />}
            label="Mapa en vivo"
          />

          {/* Always: Gasolina hoy */}
          <Pill
            href="/precio-gasolina-hoy"
            icon={<Fuel className="w-3.5 h-3.5" aria-hidden="true" />}
            label="Gasolina hoy"
          />

          {/* Seasonal operative */}
          <Pill
            href={operative.href}
            icon={<Calendar className="w-3.5 h-3.5" aria-hidden="true" />}
            label={operative.label}
          />

          {/* Conditional: AEMET alerts */}
          {aemet > 0 && (
            <Pill
              href="/alertas-meteo"
              icon={<Cloud className="w-3.5 h-3.5" aria-hidden="true" />}
              label={`Alertas AEMET${aemet > 1 ? ` (${aemet})` : ""}`}
              highlight
            />
          )}

          {/* Conditional: Renfe alerts */}
          {renfe > 0 && (
            <Pill
              href="/trenes"
              icon={<Train className="w-3.5 h-3.5" aria-hidden="true" />}
              label={`Renfe en directo${renfe > 1 ? ` (${renfe})` : ""}`}
              highlight
            />
          )}

          {/* Fallback: rotating top road */}
          <Pill
            href={road.href}
            icon={<AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
            label={road.label}
          />
        </div>
      </div>
    </nav>
  );
}
