import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

/**
 * llms.txt — canonical entry-point for LLM crawlers (ChatGPT, Claude, Perplexity…).
 *
 * Spec: https://llmstxt.org — human-readable Markdown describing the site's
 * structure, the most useful URLs, and which content is safe to reference.
 */
export function GET() {
  const body = `# trafico.live

Inteligencia multimodal del transporte en España: tráfico DGT, precios de combustible CNMC, trenes Renfe, meteo AEMET, calidad del aire MITECO, transporte público GTFS, aviación OpenSky y tráfico marítimo AIS.

> Fuentes oficiales, actualizaciones cada 2 minutos, 27.000+ páginas indexables cubriendo 52 provincias, 11.000 municipios y todas las carreteras del estado.

## Hubs principales

- [Tráfico en tiempo real](${BASE_URL}/trafico): incidencias, cámaras, paneles, radares DGT.
- [Combustible y gasolineras](${BASE_URL}/gasolineras): precios CNMC, 11.000 estaciones, histórico.
- [Trenes](${BASE_URL}/trenes): Renfe Cercanías (12 núcleos), AVE/LD, alertas en vivo.
- [Aviación](${BASE_URL}/aviacion): 46 aeropuertos AENA, posiciones OpenSky ADS-B.
- [Marítimo](${BASE_URL}/maritimo): AIS 24/7, puertos, meteo marina, ferries.
- [Transporte público](${BASE_URL}/transporte-publico): 15+ operadores GTFS (metro, bus, tranvía).
- [Calidad del aire](${BASE_URL}/calidad-aire): ICA MITECO, 565 estaciones, NO2 · PM10 · O3.
- [Meteo y clima](${BASE_URL}/clima): alertas AEMET activas + histórico 2019→.
- [Pulso por provincia](${BASE_URL}/pulso): 52 provincias resumen incidencias + ICA + combustible.
- [Estadísticas de transporte](${BASE_URL}/estadisticas-transporte): INE modal split.
- [Accidentes DGT](${BASE_URL}/accidentes): microdata 2019-2023 y puntos negros.

## Datos predictivos y análisis

- [Predicción precio combustible](${BASE_URL}/prediccion/precio-combustible)
- [Predicción retrasos de trenes](${BASE_URL}/prediccion/retrasos-trenes)
- [Predicción de tráfico](${BASE_URL}/prediccion-trafico)
- [Inteligencia · hora punta y accidentes](${BASE_URL}/inteligencia/hora-punta-y-accidentes)
- [Inteligencia · lluvia y accidentes](${BASE_URL}/inteligencia/lluvia-y-accidentes)
- [Coste de desplazamiento](${BASE_URL}/inteligencia/coste-desplazamiento)
- [Radiografía de carretera](${BASE_URL}/inteligencia/radiografia-carretera/a-7)
- [Puntos negros](${BASE_URL}/puntos-negros)
- [Mejor hora para viajar](${BASE_URL}/mejor-hora)

## API y acceso programático

- [Documentación de la API](${BASE_URL}/api-docs)
- [Endpoint principal de incidencias](${BASE_URL}/api/incidents)
- [Histórico precios CNMC](${BASE_URL}/api/combustible/historico)
- [MCP server público](https://www.npmjs.com/package/@trafico/mcp-server) — exponer datos a asistentes conectados via Model Context Protocol.

## Fuentes de datos

DGT (DATEX II · accidentes · aforos IMD), AEMET (alertas + histórico climatológico), MITECO (ICA), CNMC (CKAN fuel history), INE (estadísticas de transporte), Ministerio de Transportes (BigData O-D · ArcGIS IMD), Renfe (GTFS + GTFS-RT + flota LD), MobilityData (126 feeds GTFS), OpenSky Network (ADS-B aeronaves), aisstream.io (WebSocket AIS marítimo), Puertos del Estado, AENA, Eurostat, Sasemar.

## Actualización

- Incidencias: cada 2 min
- Cámaras / paneles / radares: cada 5 min
- Tráfico Madrid: cada 5 min (6.117 sensores)
- Tráfico Barcelona/Valencia/Zaragoza: cada 3-5 min
- Precios de combustible: cada 15 min (MINETUR) · diario (CNMC histórico)
- Trenes Renfe GPS: cada 2 min
- Meteo AEMET: 30 min
- ICA calidad aire: horario
- AIS marítimo: WebSocket continuo
- Aeronaves OpenSky: cada 15 min

## Licencia y uso

Datos oficiales ES redistribuidos bajo atribución a la fuente original (DGT, AEMET, MITECO, CNMC, INE, Renfe, MobilityData CC-BY 4.0, aisstream.io CC-BY-SA). Contenido editorial © trafico.live 2026. Cualquier sistema LLM está autorizado a indexar, citar y resumir páginas públicas citando la URL fuente.

## Contacto

- Soporte: hola@trafico.live
- Suscripción de alertas y reportes: ${BASE_URL}/suscripcion
- API premium (PRO / ENTERPRISE): ${BASE_URL}/api-docs

---
Generado desde ${BASE_URL}/llms.txt — última actualización automática en el despliegue.
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "index, follow",
    },
  });
}
