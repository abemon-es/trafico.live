import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tráfico Vial España — trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(145deg, #000025 0%, #011577 55%, #1b4bd5 100%)",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circle — highway/road hint */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 40% 40%, #f8717144 0%, #dc262611 60%, transparent 100%)",
            border: "1.5px solid #f8717122",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "60px",
            right: "60px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 35%, #f8717133 0%, #f871710a 70%, transparent 100%)",
          }}
        />

        {/* Top-left wordmark */}
        <div
          style={{
            display: "flex",
            fontSize: "20px",
            fontWeight: 600,
            color: "#94b6ff",
            letterSpacing: "0.04em",
            marginBottom: "auto",
          }}
        >
          trafico.live
        </div>

        {/* Bottom-right vertical label */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: "60px",
            right: "60px",
            fontSize: "15px",
            fontWeight: 600,
            color: "#f87171",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          TRÁFICO VIAL
        </div>

        {/* Bottom content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Title */}
          <div
            style={{
              display: "flex",
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.05,
              flexWrap: "wrap",
              gap: "0 14px",
            }}
          >
            <span style={{ color: "white" }}>Tráfico</span>
            <span style={{ color: "#eca66e" }}>Vial</span>
            <span style={{ color: "white" }}>España</span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 400,
              color: "#dde8ff",
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            Incidencias DGT · Cámaras · Radares · IMD · Paneles variables
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
