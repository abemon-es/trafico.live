import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Estado del servicio trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a1128 0%, #1e3a8a 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 80,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: 28, opacity: 0.9 }}>trafico.live</span>
        </div>
        <h1 style={{ fontSize: 80, fontWeight: 800, margin: 0 }}>Estado del servicio</h1>
        <p style={{ fontSize: 28, opacity: 0.85, marginTop: 24 }}>
          Monitorización en tiempo real · actualizado cada 30 s
        </p>
      </div>
    ),
    size,
  );
}
