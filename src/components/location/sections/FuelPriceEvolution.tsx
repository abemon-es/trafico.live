import type { GeoEntity } from "@/lib/geo/types";
import {
  getFuelPriceEvolution,
  getStationConsistency,
} from "@/lib/data/fuel-history";

export async function FuelPriceEvolution({
  entity,
}: {
  entity: GeoEntity;
}) {
  const [priceData, consistency] = await Promise.all([
    entity.provinceCode ? getFuelPriceEvolution(entity.provinceCode, 90) : null,
    getStationConsistency(entity, 30),
  ]);

  if (!priceData || priceData.city.length === 0) return null;

  // -----------------------------------------------------------------------
  // SVG chart data
  // -----------------------------------------------------------------------

  const cityDieselPrices = priceData.city.map((p) => p.avgDiesel).filter(Boolean);
  const nationalDieselPrices = priceData.national
    .map((p) => p.avgDiesel)
    .filter(Boolean);

  const allPrices = [...cityDieselPrices, ...nationalDieselPrices];
  if (allPrices.length === 0) return null;

  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  const range = maxPrice - minPrice || 0.01;

  const SVG_W = 300;
  const SVG_H = 80;
  const PADDING_TOP = 5;
  const PADDING_BOTTOM = 10;
  const CHART_H = SVG_H - PADDING_TOP - PADDING_BOTTOM;

  function toSvgPoints(prices: number[]): string {
    return prices
      .map((price, i) => {
        const x = prices.length > 1 ? (i / (prices.length - 1)) * SVG_W : SVG_W / 2;
        const y = PADDING_TOP + CHART_H - ((price - minPrice) / range) * CHART_H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  function toAreaPath(prices: number[]): string {
    if (prices.length === 0) return "";
    const points = prices.map((price, i) => {
      const x = prices.length > 1 ? (i / (prices.length - 1)) * SVG_W : SVG_W / 2;
      const y = PADDING_TOP + CHART_H - ((price - minPrice) / range) * CHART_H;
      return { x, y };
    });
    const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    return `${lineD} L ${SVG_W} ${SVG_H} L 0 ${SVG_H} Z`;
  }

  // Trend analysis
  const firstPrice = cityDieselPrices[0];
  const lastPrice = cityDieselPrices[cityDieselPrices.length - 1];
  const priceDiff = lastPrice - firstPrice;
  const trendDirection =
    priceDiff < -0.005 ? "bajista" : priceDiff > 0.005 ? "alcista" : "estable";
  const trendArrow =
    priceDiff < -0.005 ? "\u2193" : priceDiff > 0.005 ? "\u2191" : "\u2192";

  // Station consistency
  const stations = consistency.stations;

  return (
    <section
      id="evolucion-precios"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* A. Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-tl-amber-50 text-tl-amber-500 flex items-center justify-center text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-gray-900">
                Evolucion de precios &middot; 90 dias
              </h2>
              <span className="w-2 h-2 rounded-full bg-tl-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* B. SVG area chart */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-5">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          className="w-full h-[80px]"
          aria-label="Grafico de evolucion de precios de combustible"
        >
          {/* City area fill */}
          <path
            d={toAreaPath(cityDieselPrices)}
            fill="rgba(236, 166, 110, 0.15)"
          />
          {/* City line */}
          <polyline
            points={toSvgPoints(cityDieselPrices)}
            fill="none"
            stroke="#d97706"
            strokeWidth="1.5"
          />
          {/* National dashed line */}
          {nationalDieselPrices.length > 0 && (
            <polyline
              points={toSvgPoints(nationalDieselPrices)}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          )}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-[2px] bg-amber-600 rounded" />
            <span className="text-[10px] text-gray-600 font-data">
              {entity.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-[2px] bg-gray-400 rounded" style={{ borderTop: "1px dashed #9ca3af" }} />
            <span className="text-[10px] text-gray-600 font-data">Nacional</span>
          </div>
        </div>

        {/* Trend summary */}
        <p className="text-[10px] text-gray-500 mt-2">
          Tendencia: {trendArrow} {trendDirection} &middot; El gasoleo ha{" "}
          {priceDiff < 0 ? "bajado" : "subido"}{" "}
          <span className="font-data">
            {Math.abs(priceDiff).toFixed(3)} &euro;/L
          </span>{" "}
          en 90 dias
        </p>
      </div>

      {/* C. Station consistency ranking */}
      {stations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-3">
            Consistencia &middot; Quien es mas barato mas dias?
          </p>

          <div className="space-y-2">
            {stations.map((station, idx) => (
              <div key={station.id} className="flex items-center gap-3">
                <span
                  className={`font-data text-xs w-5 text-center ${
                    idx === 0
                      ? "text-tl-amber-700 font-bold"
                      : "text-gray-400"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="text-xs text-gray-700 truncate flex-1 min-w-0">
                  {station.name}
                </span>
                <div className="w-20 h-[6px] bg-gray-100 rounded-full flex-shrink-0">
                  <div
                    className="h-full bg-tl-amber-400 rounded-full"
                    style={{
                      width: `${Math.min(
                        (station.cheapestDays / station.totalDays) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <span className="font-data text-[10px] text-gray-500 w-12 text-right flex-shrink-0">
                  {station.cheapestDays}/{station.totalDays} dias
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attribution */}
      <p className="mt-5 text-[10px] text-gray-400">
        Fuente: Ministerio para la Transicion Ecologica
      </p>
    </section>
  );
}
