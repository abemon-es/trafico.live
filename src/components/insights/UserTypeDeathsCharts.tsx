"use client";

/**
 * Deaths at 30 days by user type, as stacked bars: one series per user type
 * of the page (e.g. trucks ≤ 3,500 kg and > 3,500 kg). Only deaths are
 * plotted, labelled as such: these figures count people killed, not
 * accidents (src/lib/user-type-deaths.ts).
 */

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Series {
  key: string;
  label: string;
}

const COLORS = ["var(--color-tl-600)", "var(--color-tl-amber-500)", "var(--color-tl-300)"];

export function DeathsBarChart({
  title,
  description,
  data,
  xKey,
  series,
}: {
  title: string;
  description: string;
  data: Record<string, number | string>[];
  xKey: string;
  series: Series[];
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <h3 className="text-base font-heading font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-tl-100)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "var(--color-tl-400)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-tl-400)" }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
          <Tooltip formatter={(v, name) => [v, series.find((s) => s.key === name)?.label ?? String(name)]} />
          {series.length > 1 && <Legend formatter={(v: string) => series.find((s) => s.key === v)?.label ?? v} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} stackId="deaths" fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
