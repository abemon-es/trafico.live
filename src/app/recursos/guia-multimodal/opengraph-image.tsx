/**
 * OG Image for /recursos/guia-multimodal
 * Uses Next.js ImageResponse (1200×630)
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Guía multimodal de España 2026 — trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1b4bd5 0%, #092ea8 60%, #011577 100%)",
          padding: "64px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "24px",
            padding: "8px 20px",
            width: "fit-content",
            marginBottom: "32px",
          }}
        >
          <span style={{ color: "#c0d5ff", fontSize: "14px", fontWeight: 600, letterSpacing: "0.08em" }}>
            GUÍA · 2026
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: "58px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.1,
            maxWidth: "800px",
            marginBottom: "24px",
            letterSpacing: "-0.02em",
          }}
        >
          Guía multimodal de España
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "26px",
            color: "#c0d5ff",
            fontWeight: 400,
            marginBottom: "48px",
            maxWidth: "680px",
          }}
        >
          Tren, avión, ferry, autobús y coche — comparativa real 2026
        </div>

        {/* Mode chips */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            { emoji: "🚄", label: "AVE" },
            { emoji: "✈️", label: "Vuelos" },
            { emoji: "⛴️", label: "Ferrys" },
            { emoji: "🚌", label: "Autobús" },
            { emoji: "🚗", label: "Coche" },
          ].map(({ emoji, label }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                padding: "8px 16px",
                color: "#ffffff",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Brand watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "48px",
            right: "64px",
            color: "rgba(255,255,255,0.5)",
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          trafico.live
        </div>

        {/* Decorative circle */}
        <div
          style={{
            position: "absolute",
            right: "-80px",
            top: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "20px",
            top: "20px",
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
