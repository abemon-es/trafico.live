/**
 * Monthly traffic report PDF renderer.
 * Uses @react-pdf/renderer — NOT CSS variables (no browser environment).
 * All colors are safe hex values approximated from trafico.live brand tokens.
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
// Brand colors (safe hex — no CSS vars)
// ---------------------------------------------------------------------------
const COLORS = {
  tlPrimary: "#1b4bd5",
  tlPrimaryLight: "#366cf8",
  tlPrimaryBg: "#f0f5ff",
  tlAmber: "#b56200",
  tlAmberLight: "#d48139",
  tlSea: "#0369a1",
  tlSuccess: "#059669",
  tlDanger: "#dc2626",
  darkBg: "#0b0f1a",
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray500: "#6b7280",
  gray700: "#374151",
  gray900: "#111827",
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  coverPage: {
    backgroundColor: COLORS.darkBg,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 60,
    paddingVertical: 60,
  },
  badge: {
    backgroundColor: COLORS.tlPrimary,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
  },
  coverTitle: {
    fontSize: 40,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    marginBottom: 12,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 16,
    color: "#94b6ff",
    marginBottom: 32,
  },
  coverMeta: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.tlPrimary,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    paddingBottom: 4,
  },
  subsectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray700,
    marginBottom: 6,
    marginTop: 12,
  },
  paragraph: {
    fontSize: 10,
    color: COLORS.gray700,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.tlPrimaryBg,
    borderRadius: 6,
    padding: 10,
  },
  kpiValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.tlPrimary,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 8,
    color: COLORS.gray500,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.tlPrimary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  tableRowAlt: {
    backgroundColor: COLORS.gray50,
  },
  tableCellHeader: {
    color: COLORS.white,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  tableCell: {
    color: COLORS.gray700,
    fontSize: 9,
  },
  barContainer: {
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.gray700,
    marginBottom: 2,
  },
  barBg: {
    height: 10,
    backgroundColor: COLORS.gray100,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 10,
    backgroundColor: COLORS.tlPrimary,
    borderRadius: 3,
  },
  barAmber: {
    backgroundColor: COLORS.tlAmber,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.gray500,
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.tlPrimary,
  },
  pageNumber: {
    fontSize: 8,
    color: COLORS.gray500,
  },
  sectionDivider: {
    marginVertical: 16,
  },
  noData: {
    backgroundColor: COLORS.gray50,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 9,
    color: COLORS.gray500,
    fontStyle: "italic",
  },
});

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------
export interface ReportData {
  year: number;
  month: number; // 1-12
  monthName: string; // "Abril 2026"
  generatedAt: string; // ISO string
  summary: string;

  // Incidents
  incidentsTotal: number;
  incidentsByWeek: { week: string; count: number }[];
  topRoads: { road: string; incidents: number }[];

  // Weather
  weatherAlertsCount: number;
  weatherExtremes: { type: string; province: string; value: string }[];

  // Fuel
  fuelTable: { fuel: string; avgStart: number; avgEnd: number; delta: number }[];

  // Rail
  railPunctuality: { brand: string; onTimePercent: number; delayAvgMin: number }[];

  // Maritime
  topPorts: { port: string; vesselCalls: number }[];

  // Aviation
  topAirports: { airport: string; flights: number }[];
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------
function Footer({ monthName }: { monthName: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Datos de DGT, AEMET, CNMC, Renfe, Eurostat. Generado automáticamente por trafico.live.
      </Text>
      <Text style={styles.footerBrand}>trafico.live · {monthName}</Text>
    </View>
  );
}

function SimpleBar({
  label,
  value,
  maxValue,
  isAmber = false,
}: {
  label: string;
  value: number;
  maxValue: number;
  isAmber?: boolean;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <View style={styles.barContainer}>
      <Text style={styles.barLabel}>
        {label} ({value})
      </Text>
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            isAmber ? styles.barAmber : {},
            { width: `${Math.min(100, pct)}%` },
          ]}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main document
// ---------------------------------------------------------------------------
export function MonthlyReportPDF({ data }: { data: ReportData }) {
  const maxWeekly = Math.max(...data.incidentsByWeek.map((w) => w.count), 1);
  const maxRoad = Math.max(...data.topRoads.map((r) => r.incidents), 1);

  return (
    <Document
      title={`Estado del tráfico en España — ${data.monthName}`}
      author="trafico.live"
      subject={`Informe mensual de movilidad y tráfico — ${data.monthName}`}
      creator="trafico.live"
    >
      {/* ---- COVER ---- */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>INFORME MENSUAL</Text>
        </View>
        <Text style={styles.coverTitle}>Estado del{"\n"}tráfico en España</Text>
        <Text style={styles.coverSubtitle}>{data.monthName}</Text>
        <Text style={styles.coverMeta}>trafico.live</Text>
        <Text style={styles.coverMeta}>Certus SPV, SLU · Desarrollado por Abemon</Text>
        <Text style={styles.coverMeta}>
          Generado: {new Date(data.generatedAt).toLocaleDateString("es-ES")}
        </Text>
      </Page>

      {/* ---- INDEX ---- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Índice de contenidos</Text>
        {[
          "1. Resumen ejecutivo",
          "2. Incidencias de tráfico",
          "3. Carreteras más afectadas",
          "4. Meteorología destacada",
          "5. Precios de combustible",
          "6. Puntualidad ferroviaria",
          "7. Tráfico marítimo",
          "8. Tráfico aéreo",
        ].map((item, i) => (
          <Text key={i} style={[styles.paragraph, { marginBottom: 4 }]}>
            {item}
          </Text>
        ))}
        <Footer monthName={data.monthName} />
      </Page>

      {/* ---- EXECUTIVE SUMMARY ---- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>1. Resumen ejecutivo</Text>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data.incidentsTotal}</Text>
            <Text style={styles.kpiLabel}>Incidencias registradas</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data.weatherAlertsCount}</Text>
            <Text style={styles.kpiLabel}>Alertas meteorológicas</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data.topPorts[0]?.vesselCalls ?? "—"}</Text>
            <Text style={styles.kpiLabel}>Entradas al puerto líder</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{data.topAirports[0]?.flights ?? "—"}</Text>
            <Text style={styles.kpiLabel}>Vuelos aerop. líder</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>{data.summary}</Text>
        <Footer monthName={data.monthName} />
      </Page>

      {/* ---- INCIDENTS ---- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>2. Incidencias de tráfico</Text>
        <Text style={styles.paragraph}>
          Durante {data.monthName} se registraron{" "}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{data.incidentsTotal}</Text>{" "}
          incidencias en la red viaria española según datos de la DGT.
        </Text>

        {data.incidentsByWeek.length > 0 ? (
          <>
            <Text style={styles.subsectionTitle}>Incidencias por semana</Text>
            {data.incidentsByWeek.map((w) => (
              <SimpleBar
                key={w.week}
                label={w.week}
                value={w.count}
                maxValue={maxWeekly}
              />
            ))}
          </>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>
              Datos semanales no disponibles para este periodo.
            </Text>
          </View>
        )}

        {/* Top 10 roads */}
        <Text style={styles.subsectionTitle}>
          3. Carreteras más afectadas
        </Text>
        {data.topRoads.length > 0 ? (
          data.topRoads.slice(0, 10).map((r) => (
            <SimpleBar
              key={r.road}
              label={r.road}
              value={r.incidents}
              maxValue={maxRoad}
              isAmber
            />
          ))
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>Sin datos de carreteras.</Text>
          </View>
        )}

        <Footer monthName={data.monthName} />
      </Page>

      {/* ---- WEATHER ---- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>4. Meteorología destacada</Text>
        <Text style={styles.paragraph}>
          Se emitieron{" "}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            {data.weatherAlertsCount}
          </Text>{" "}
          alertas AEMET durante {data.monthName}.
        </Text>

        {data.weatherExtremes.length > 0 ? (
          <>
            <Text style={styles.subsectionTitle}>Eventos extremos destacados</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Tipo</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Provincia</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Valor</Text>
            </View>
            {data.weatherExtremes.map((e, i) => (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  i % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={[styles.tableCell, { flex: 2 }]}>{e.type}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{e.province}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{e.value}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>
              No se registraron eventos meteorológicos extremos este mes.
            </Text>
          </View>
        )}

        <Footer monthName={data.monthName} />
      </Page>

      {/* ---- FUEL ---- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>5. Precios de combustible</Text>
        <Text style={styles.paragraph}>
          Evolución mensual de precios medios en España según datos MINETUR / CNMC.
        </Text>

        {data.fuelTable.length > 0 ? (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>Combustible</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Inicio mes</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Fin mes</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Variación</Text>
            </View>
            {data.fuelTable.map((row, i) => {
              const delta = row.delta;
              const deltaStr = `${delta >= 0 ? "+" : ""}${delta.toFixed(3)} €/L`;
              return (
                <View
                  key={i}
                  style={[
                    styles.tableRow,
                    i % 2 === 1 ? styles.tableRowAlt : {},
                  ]}
                >
                  <Text style={[styles.tableCell, { flex: 3 }]}>{row.fuel}</Text>
                  <Text style={[styles.tableCell, { flex: 2, fontFamily: "Helvetica" }]}>
                    {row.avgStart.toFixed(3)} €
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {row.avgEnd.toFixed(3)} €
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { flex: 2 },
                      delta > 0
                        ? { color: COLORS.tlDanger }
                        : delta < 0
                        ? { color: COLORS.tlSuccess }
                        : {},
                    ]}
                  >
                    {deltaStr}
                  </Text>
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>
              Datos de combustible no disponibles.
            </Text>
          </View>
        )}

        <Footer monthName={data.monthName} />
      </Page>

      {/* ---- RAIL + MARITIME + AVIATION ---- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>6. Puntualidad ferroviaria</Text>
        {data.railPunctuality.length > 0 ? (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>Marca</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Puntualidad</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Retraso medio</Text>
            </View>
            {data.railPunctuality.map((row, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, { flex: 3 }]}>{row.brand}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {row.onTimePercent.toFixed(1)}%
                </Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {row.delayAvgMin.toFixed(1)} min
                </Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>
              Datos de puntualidad no disponibles.
            </Text>
          </View>
        )}

        {/* Maritime */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>7. Tráfico marítimo</Text>
        <Text style={styles.paragraph}>
          Top 5 puertos españoles por número de escalas registradas.
        </Text>
        {data.topPorts.length > 0 ? (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>Puerto</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Escalas</Text>
            </View>
            {data.topPorts.slice(0, 5).map((p, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, { flex: 3 }]}>{p.port}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{p.vesselCalls}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>Sin datos marítimos.</Text>
          </View>
        )}

        {/* Aviation */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>8. Tráfico aéreo</Text>
        <Text style={styles.paragraph}>
          Top 5 aeropuertos AENA por posiciones de aeronaves registradas.
        </Text>
        {data.topAirports.length > 0 ? (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>Aeropuerto</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Vuelos</Text>
            </View>
            {data.topAirports.slice(0, 5).map((a, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, { flex: 3 }]}>{a.airport}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{a.flights}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>Sin datos de aviación.</Text>
          </View>
        )}

        <Footer monthName={data.monthName} />
      </Page>
    </Document>
  );
}
