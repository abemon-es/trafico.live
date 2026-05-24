"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Types (matching server page) ─────────────────────────────────────────────

export interface GscDailyRow {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
}

export interface Ga4DailyRow {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
}

export interface Ga4DeviceRow {
  device: string;
  sessions: number;
}

export interface Ga4SourceRow {
  source: string;
  medium: string;
  sessions: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [, month, day] = iso.split("-");
  return `${parseInt(day)}/${parseInt(month)}`;
}

// ─── Visibility chart: clicks + impressions area chart ────────────────────────

export function VisibilityChart({ data }: { data: GscDailyRow[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
        Sin datos de serie temporal
      </div>
    );
  }

  const formatted = data.map((r) => ({
    ...r,
    label: shortDate(r.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradImpressions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#366cf8" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#366cf8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1b4bd5" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#1b4bd5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          yAxisId="impr"
          orientation="right"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <YAxis
          yAxisId="clicks"
          orientation="left"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(99,147,255,0.3)",
            borderRadius: "8px",
            fontSize: 12,
            color: "#e2e8f0",
          }}
          formatter={
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((value: any, name: string) => [Number(value ?? 0).toLocaleString("es-ES"), name]) as any
          }
        />
        <Area
          yAxisId="impr"
          type="monotone"
          dataKey="impressions"
          name="impressiones"
          stroke="#366cf8"
          strokeWidth={1.5}
          fill="url(#gradImpressions)"
          dot={false}
        />
        <Area
          yAxisId="clicks"
          type="monotone"
          dataKey="clicks"
          name="clics"
          stroke="#1b4bd5"
          strokeWidth={2}
          fill="url(#gradClicks)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── GA4 sessions chart ────────────────────────────────────────────────────────

export function SessionsChart({ data }: { data: Ga4DailyRow[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        Sin datos de sesiones
      </div>
    );
  }

  const formatted = data.map((r) => ({
    ...r,
    label: shortDate(r.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={formatted} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#b56200" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#b56200" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(181,98,0,0.3)",
            borderRadius: "8px",
            fontSize: 12,
            color: "#e2e8f0",
          }}
          formatter={(value: number | undefined) => [(value ?? 0).toLocaleString("es-ES"), "sesiones"]}
        />
        <Area
          type="monotone"
          dataKey="sessions"
          name="sesiones"
          stroke="#d48139"
          strokeWidth={2}
          fill="url(#gradSessions)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Device donut chart ────────────────────────────────────────────────────────

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#1b4bd5",
  mobile: "#366cf8",
  tablet: "#94b6ff",
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Escritorio",
  mobile: "Móvil",
  tablet: "Tablet",
};

export function DeviceChart({ data }: { data: Ga4DeviceRow[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        Sin datos de dispositivo
      </div>
    );
  }

  const total = data.reduce((s, r) => s + r.sessions, 0);
  const formatted = data.map((r) => ({
    name: DEVICE_LABELS[r.device] ?? r.device,
    value: r.sessions,
    pct: total > 0 ? ((r.sessions / total) * 100).toFixed(1) : "0",
    color: DEVICE_COLORS[r.device] ?? "#6b7280",
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={72}
          paddingAngle={2}
          dataKey="value"
        >
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(99,147,255,0.3)",
            borderRadius: "8px",
            fontSize: 12,
            color: "#e2e8f0",
          }}
          formatter={
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((value: any, name: string) => [
              `${Number(value ?? 0).toLocaleString("es-ES")} (${formatted.find((r) => r.name === name)?.pct ?? 0}%)`,
              name,
            ]) as any
          }
        />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Traffic source bar chart ──────────────────────────────────────────────────

function sourceLabel(source: string, medium: string): string {
  if (source === "(direct)" || medium === "(none)") return "Directo";
  if (medium === "organic") return `Orgánico (${source})`;
  if (medium === "referral") return `Referral (${source})`;
  if (medium === "social") return `Social (${source})`;
  return `${source} / ${medium}`;
}

export function SourceChart({ data }: { data: Ga4SourceRow[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        Sin datos de fuente
      </div>
    );
  }

  const formatted = data.slice(0, 10).map((r) => ({
    name: sourceLabel(r.source, r.medium),
    value: r.sessions,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, formatted.length * 28)}>
      <BarChart
        layout="vertical"
        data={formatted}
        margin={{ top: 4, right: 32, left: 8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(107,114,128,0.15)"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(99,147,255,0.3)",
            borderRadius: "8px",
            fontSize: 12,
            color: "#e2e8f0",
          }}
          formatter={(value: number | undefined) => [(value ?? 0).toLocaleString("es-ES"), "sesiones"]}
        />
        <Bar dataKey="value" fill="#366cf8" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
