"use client";

/**
 * BotChart — Recharts AreaChart showing daily bot visits per bot over 30d.
 * Client component (Recharts requires browser).
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface TimeseriesRow {
  date: string; // "YYYY-MM-DD"
  bot: string;
  count: number;
}

interface BotChartProps {
  timeseries: TimeseriesRow[];
  bots: string[];
}

// Brand-consistent palette — ordered to match bot importance
const BOT_COLORS: Record<string, string> = {
  "GPTBot":           "#10a37f", // OpenAI green
  "ChatGPT-User":     "#10a37f",
  "OAI-SearchBot":    "#74aa9c",
  "ClaudeBot":        "#cc785c", // Anthropic copper
  "Claude-Web":       "#cc785c",
  "Anthropic-AI":     "#cc785c",
  "PerplexityBot":    "#20b2aa",
  "Perplexity-User":  "#20b2aa",
  "Google-Extended":  "#4285f4",
  "GoogleOther":      "#34a853",
  "Applebot":         "#555555",
  "Applebot-Extended":"#555555",
  "Bytespider":       "#f59e0b",
  "CCBot":            "#8b5cf6",
  "DuckAssistBot":    "#de5833",
  "MistralAI-User":   "#ff7000",
  "cohere-ai":        "#39d353",
  "Diffbot":          "#1b4bd5",
};

function getBotColor(bot: string, index: number): string {
  if (BOT_COLORS[bot]) return BOT_COLORS[bot];
  // Fallback palette
  const fallbacks = [
    "#1b4bd5", "#d48139", "#059669", "#dc2626", "#7c3aed",
    "#0891b2", "#db2777", "#ca8a04",
  ];
  return fallbacks[index % fallbacks.length];
}

// Pivot timeseries rows into { date, [bot]: count } shape for Recharts
function pivotTimeseries(
  timeseries: TimeseriesRow[],
  bots: string[]
): Record<string, number | string>[] {
  const map = new Map<string, Record<string, number | string>>();
  for (const row of timeseries) {
    let entry = map.get(row.date);
    if (!entry) {
      entry = { date: row.date };
      for (const b of bots) entry[b] = 0;
      map.set(row.date, entry);
    }
    entry[row.bot] = (entry[row.bot] as number ?? 0) + row.count;
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.date as string).localeCompare(b.date as string)
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function BotChart({ timeseries, bots }: BotChartProps) {
  const data = pivotTimeseries(timeseries, bots);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-600 text-sm">
        Sin datos por ahora — el gráfico se llenará en las próximas horas
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          {bots.map((bot, i) => (
            <linearGradient key={bot} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={getBotColor(bot, i)} stopOpacity={0.25} />
              <stop offset="95%" stopColor={getBotColor(bot, i)} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--background)",
            border: "1px solid rgba(156,163,175,0.3)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelFormatter={(label) => formatDate(label as string)}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {bots.map((bot, i) => (
          <Area
            key={bot}
            type="monotone"
            dataKey={bot}
            stroke={getBotColor(bot, i)}
            strokeWidth={2}
            fill={`url(#grad-${i})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
