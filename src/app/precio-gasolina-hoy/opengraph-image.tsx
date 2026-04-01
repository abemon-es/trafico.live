import { ImageResponse } from "next/og";
import prisma from "@/lib/db";

export const runtime = "nodejs";
export const alt = "Precio Gasolina Hoy en España — trafico.live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const stats = await prisma.gasStation.aggregate({
    _avg: { priceGasolina95E5: true },
    _min: { priceGasolina95E5: true },
    _max: { priceGasolina95E5: true },
    where: { priceGasolina95E5: { gt: 0 } },
  });

  const avg = stats._avg.priceGasolina95E5
    ? Number(stats._avg.priceGasolina95E5).toFixed(3)
    : "—";
  const min = stats._min.priceGasolina95E5
    ? Number(stats._min.priceGasolina95E5).toFixed(3)
    : "—";
  const max = stats._max.priceGasolina95E5
    ? Number(stats._max.priceGasolina95E5).toFixed(3)
    : "—";

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "linear-gradient(135deg, #1e3a8a 0%, #1b4bd5 50%, #3b82f6 100%)", padding: "60px", fontFamily: "system-ui, sans-serif", color: "white" }}>
        <div style={{ display: "flex", fontSize: "20px", fontWeight: 600, opacity: 0.8, marginBottom: "20px" }}>trafico.live</div>
        <div style={{ display: "flex", fontSize: "48px", fontWeight: 800, marginBottom: "40px" }}>Precio Gasolina 95 Hoy</div>
        <div style={{ display: "flex", gap: "40px", marginBottom: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.15)", borderRadius: "16px", padding: "24px 40px" }}>
            <div style={{ display: "flex", fontSize: "14px", opacity: 0.7, marginBottom: "8px" }}>Media nacional</div>
            <div style={{ display: "flex", fontSize: "56px", fontWeight: 800 }}>{avg}€/L</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px 32px" }}>
            <div style={{ display: "flex", fontSize: "14px", opacity: 0.7, marginBottom: "8px" }}>Más barata</div>
            <div style={{ display: "flex", fontSize: "40px", fontWeight: 700 }}>{min}€</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px 32px" }}>
            <div style={{ display: "flex", fontSize: "14px", opacity: 0.7, marginBottom: "8px" }}>Más cara</div>
            <div style={{ display: "flex", fontSize: "40px", fontWeight: 700 }}>{max}€</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: "16px", opacity: 0.5, marginTop: "auto" }}>Datos del Ministerio de Industria</div>
      </div>
    ),
    { ...size }
  );
}
