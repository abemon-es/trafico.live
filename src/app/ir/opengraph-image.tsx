import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Rutas interurbanas multimodal — trafico.live";
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
            "linear-gradient(145deg, #000245 0%, #011577 50%, #1b4bd5 100%)",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative arc — route hint */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            border: "1.5px solid #eca66e22",
            background:
              "radial-gradient(circle at 40% 40%, #eca66e33 0%, #b5620011 60%, transparent 100%)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "80px",
            right: "80px",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 35%, #eca66e22 0%, #eca66e08 70%, transparent 100%)",
          }}
        />

        {/* Wordmark */}
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

        {/* Bottom label */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: "60px",
            right: "60px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#eca66e",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          RUTAS MULTIMODAL
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "64px",
              fontWeight: 800,
              lineHeight: 1.05,
              flexWrap: "wrap",
              gap: "0 14px",
            }}
          >
            <span style={{ color: "white" }}>Como ir</span>
            <span style={{ color: "#eca66e" }}>a cualquier parte</span>
          </div>
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
            Coche · Tren · Bus · Avion — 2.450 rutas interurbanas
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
