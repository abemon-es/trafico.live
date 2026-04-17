import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "API de datos multimodal — trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #000245 0%, #092ea8 60%, #1b4bd5 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              background: "#d48139",
              color: "#401f00",
              fontSize: "14px",
              fontWeight: 700,
              padding: "6px 16px",
              borderRadius: "999px",
              letterSpacing: "0.05em",
            }}
          >
            API v1.0
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "58px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.1,
            maxWidth: "900px",
            marginBottom: "24px",
          }}
        >
          API de datos de tráfico, trenes, aviones y barcos
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            color: "#94b6ff",
            maxWidth: "720px",
            lineHeight: 1.5,
            marginBottom: "48px",
          }}
        >
          121 endpoints REST · Tiempo real + histórico · España
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "32px" }}>
          {[
            { value: "FREE", label: "Empieza gratis" },
            { value: "49€", label: "PRO / mes" },
            { value: "149€", label: "Enterprise / mes" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                padding: "16px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#ffffff",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {stat.value}
              </span>
              <span style={{ fontSize: "13px", color: "#6393ff" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: "48px",
            right: "80px",
            fontSize: "18px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          trafico.live
        </div>
      </div>
    ),
    { ...size }
  );
}
