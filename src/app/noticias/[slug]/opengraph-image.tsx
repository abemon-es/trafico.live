import { ImageResponse } from "next/og";
import prisma from "@/lib/db";

export const runtime = "nodejs";
export const alt = "trafico.live — Informe de tráfico";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_LABELS: Record<string, string> = {
  DAILY_REPORT: "Informe diario",
  WEEKLY_REPORT: "Informe semanal",
  MONTHLY_REPORT: "Informe mensual",
  ANNUAL_REPORT: "Análisis anual",
  ROAD_ANALYSIS: "Análisis de carretera",
  PRICE_ALERT: "Precio combustible",
  FUEL_TREND: "Tendencia combustible",
  INCIDENT_DIGEST: "Alerta de incidencias",
  WEATHER_ALERT: "Alerta meteorológica",
  GUIDE: "Guía",
  NEWS: "Noticias",
  ANALYSIS: "Análisis",
  REGULATORY: "Normativa",
};

const CATEGORY_COLORS: Record<string, string> = {
  DAILY_REPORT: "#f59e0b",
  WEEKLY_REPORT: "#3b82f6",
  MONTHLY_REPORT: "#8b5cf6",
  ANNUAL_REPORT: "#10b981",
  ROAD_ANALYSIS: "#06b6d4",
  PRICE_ALERT: "#ef4444",
  FUEL_TREND: "#f97316",
  INCIDENT_DIGEST: "#dc2626",
  WEATHER_ALERT: "#6366f1",
  GUIDE: "#14b8a6",
  NEWS: "#64748b",
  ANALYSIS: "#8b5cf6",
  REGULATORY: "#475569",
};

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { title: true, summary: true, category: true, publishedAt: true, source: true },
  });

  if (!article) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#0a0a0a",
            color: "#ffffff",
            fontSize: 48,
            fontFamily: "sans-serif",
          }}
        >
          trafico.live
        </div>
      ),
      { ...size }
    );
  }

  const categoryLabel = CATEGORY_LABELS[article.category] || "Informe";
  const accentColor = CATEGORY_COLORS[article.category] || "#f59e0b";
  const dateStr = article.publishedAt.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#0a0a0a",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar with category badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div
            style={{
              backgroundColor: accentColor,
              color: "#ffffff",
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: 20,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {categoryLabel}
          </div>
          {article.source && (
            <div style={{ color: "#9ca3af", fontSize: 18 }}>
              Datos: {article.source}
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            color: "#ffffff",
            fontSize: article.title.length > 60 ? 36 : 44,
            fontWeight: 800,
            lineHeight: 1.2,
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          {article.title}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "2px solid #1f2937",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Logo circle */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              T
            </div>
            <div style={{ color: "#e5e7eb", fontSize: 24, fontWeight: 700 }}>
              trafico.live
            </div>
          </div>
          <div style={{ color: "#6b7280", fontSize: 18 }}>
            {dateStr}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
