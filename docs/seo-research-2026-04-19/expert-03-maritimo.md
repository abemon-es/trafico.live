# Expert SEO — Vertical Marítimo ES+PT
**trafico.live · 2026-04-19 · Scope: ferries, buques, puertos, AIS, rutas marítimas, navieras**

---

## 1. Intent Cartography Marítimo — 10 Clusters

### Resumen ejecutivo de volúmenes

| Cluster | Vol total estimado ES+PT | KD predominante | Acción |
|---|---|---|---|
| BOOKING (rutas ferry) | ~396K/mes (418 kws, SV≥100) | HIGH | Afiliado, no competir orgánico |
| NAVIERA BRAND | ~680K/mes (57 kws) | LOW–MED | Mención contextual, afiliado |
| TRACKING real-time | ~8.2K/mes directo (5 kws explícitos) + ~22K AIS/vessel EN | LOW | **Orgánico — sin competencia ES** |
| HORARIO / PRÓXIMO FERRY | ~19K/mes (14 kws) — "próximo ferry" 14.8K solo | LOW | **Orgánico — hueco real** |
| PUERTO INFO/STATS | ~50K/mes (Algeciras 22K, Valencia 27K, Barcelona 33K) | LOW | Orgánico — contenido editorial |
| VESSEL ID / MMSI | ~12K/mes (vessel-name + mmsi EN-dominado) | LOW | Orgánico — `buques/[slug]` ya existe |
| SEGURIDAD / SASEMAR | <1K/mes | LOW | Thin content + SASEMAR feed |
| METEO MARINO | ~5K/mes cruzado | LOW | Integrar en `/maritimo/meteorologia` |
| CRUCEROS | ~37K/mes (14.8K "cruceros barcelona", 8.1K "cruceros última hora") | HIGH | Editorial, no tracking |
| INFRAESTRUCTURA NÁUTICA | ~2K/mes (combustible, amarres) | LOW | `/maritimo/combustible` ya existe |

---

### Cluster 1 — BOOKING (OTAs dominan, solo afiliado)

Las SERPs de booking están capturadas completamente por OTAs. Evidencia `wave4`:

| Keyword | Vol | CPC | KD | Top 3 SERP |
|---|---|---|---|---|
| ferry ibiza precio | 6.570K | €1.83 | HIGH (AI Overview) | balearia.com, directferries.es, clickferry.com |
| ferry mallorca precio | ~107 (variante long) | €1.44 | HIGH (AI Overview) | directferries.es, clickferry.com, balearia.com |
| ferry a Ibiza | 2.400K | €0.83 | HIGH | balearia.com, directferries.es, clickferry.com |
| ferry a Mallorca | 4.400K | €0.83 | HIGH | balearia.com, directferries.es, trasmed.com |
| ferry Algeciras Ceuta | 6.600K | €1.32 | HIGH | balearia.com, clickferry.com, armastrasmediterranea.com |
| ferry a Canarias | 720K | €0.38 | MEDIUM | armastrasmediterranea.com, directferries.es, balearia.com |
| ferry Barcelona Mallorca | 8.100K | €1.44 | HIGH | OTAs+navieras |
| ferry Valencia Ibiza | 6.600K | €1.21 | HIGH | OTAs+navieras |

**Conclusión:** Posición 1–10 booking orgánico es imposible a 6–12 meses contra directferries.es, clickferry.com, ferryhopper.com, omio.es. Todos tienen domain authority masivo, estructuras CMS con miles de páginas de ruta, y probablemente acuerdos directos de comisión con las navieras. **No intentar ranking booking orgánico.**

AI Overview activo en "ferry mallorca precio" e "ferry ibiza precio": señal de que Google satura aún más el espacio booking con respuestas directas.

---

### Cluster 2 — TRACKING ("¿dónde está mi ferry?")

**El hueco más importante y el que trafico.live puede ganar.**

| Keyword | Vol/mes | CPC | KD | Competencia actual |
|---|---|---|---|---|
| radar barcos | 5.400 | €1.36 | LOW | MarineTraffic (pos 8), VesselFinder (pos 1), sailingheaven (pos 2) |
| barcos en tiempo real | 1.900 | — | LOW | VesselFinder, sailingheaven, marinetraffic.live |
| seguimiento barcos | 1.300 | — | LOW | Apps stores, interseas.es (listicle) |
| localizador de barcos en tiempo real | 320 | — | LOW | VesselFinder |
| seguimiento buques | 210 | — | LOW | VesselFinder, interseas.es |
| localizar barcos en tiempo real | 880 | €0.13 | LOW | VesselFinder |
| buques en puerto | 390 | — | LOW | salvamentomaritimo.org, IEO |
| ais barcos | 2.400 | €0.05 | LOW | MarineTraffic (pos 4), VesselFinder |
| radar de barcos | 1.900 | — | LOW | MarineTraffic (pos 5), VesselFinder |
| buscador de barcos | 1.900 | — | LOW | MarineTraffic (pos 5) |

**Análisis SERP "barcos tiempo real" (wave4, 22.6M resultados):**
1. VesselFinder — mapa AIS, paywall
2. sailingheaven.org — tabla estática, sin mapa interactivo ES
3. marinetraffic.live — clon EN, no localizado
4. ieo.es — solo buques oceanográficos IEO
5–7. App stores (Play/Apple) — no compiten en web
8. interseas.es — artículo de blog "mejores apps"
10. marinetraffic.com — EN-first, paywall en posición avanzada

**Gap confirmado:** Ningún resultado ofrece mapa AIS interactivo en español, gratuito, con datos Spain-first, contexto de puertos españoles, y ferry status integrado. El SERP no tiene AI Overview, no tiene featured snippet, no tiene live widget. Es el SERP más "abierto" de toda la vertical.

---

### Cluster 3 — HORARIO / PRÓXIMO FERRY

| Keyword | Vol/mes | CPC | KD | Notas |
|---|---|---|---|---|
| próximo ferry | **14.800** | **€2.72** | **LOW** | Intent clarísimo: "¿cuándo sale el siguiente?" — sin respuesta real |
| horario ferry Algeciras Ceuta | 1.300 | €0.44 | LOW | apba.es tiene tabla estática |
| horario ferry ceuta algeciras | 1.000 | €0.43 | LOW | — |
| horario ferry ceuta | 170 | €0.33 | LOW | — |
| horario ferry denia ibiza | 140 | €0.61 | MEDIUM | — |
| próximo ferry Formentera | 260 | €0 | LOW | "último ferry Ibiza Formentera" 140/mes |
| horario Fred Olsen hoy | 880 | €0.24 | LOW | Fred Olsen website (pos 1) pero no live |
| ultimo ferry ibiza formentera | 140 | — | LOW | — |
| ferry melilla málaga horarios y precios | 320 | €0.21 | LOW | — |

"Próximo ferry" (14.8K/mes, CPC €2.72, KD LOW, fuente w3) es la keyword más valiosa del cluster: el usuario quiere saber el siguiente barco que sale, hoy, ahora. **Ninguna web lo resuelve con datos en tiempo real en español.** Fred Olsen y Baleària tienen páginas de horarios pero son tablas estáticas sin estado actual. El CPC alto (€2.72) confirma intent transaccional pero la KD LOW confirma que nadie ha optimizado contenido informacional + real-time.

---

### Cluster 4 — PUERTO INFO/STATS

| Keyword | Vol/mes | CPC | KD | Competencia actual |
|---|---|---|---|---|
| puerto de Algeciras | 22.200 | €0.07 | LOW | apba.es (pos 1), wikipedia (pos 2) |
| puerto de Valencia | 27.100 | €0.48 | LOW | valenciaport.com (pos 1), wikipedia (pos 2) |
| puerto de Barcelona | 33.100 | €0.47 | LOW | portdebarcelona.cat, wikipedia |
| puerto de Bilbao | ~8.100 | — | LOW | portusbilbao.com |
| puerto algeciras | 12.100 | €0.08 | LOW | apba.es |

SERPs dominadas por autoridades portuarias institucionales y Wikipedia. Ninguno ofrece:
- Qué buques están en el puerto ahora mismo
- Entradas/salidas de las últimas 24h
- Estadísticas de tráfico actualizadas
- Integración con AIS para visualizar el fondeadero

**PAA en "puerto de Valencia":** "¿Cómo se llama el puerto de Valencia?", "¿Qué hay en el puerto de Valencia hoy?", "Puerto de Valencia ferry" — señal de intent dinámico.

---

### Cluster 5 — VESSEL ID / MMSI

MarineTraffic captura este cluster principalmente en EN, con posiciones 1–4 para "ship tracking" (6.6K), "ais marine traffic" (720/mes), "track vessel" (6.6K en EN). En español:

| Keyword | Vol/mes | KD | Competencia |
|---|---|---|---|
| localización barcos | 5.400 | LOW | MarineTraffic (pos 5–7), VesselFinder (pos 1) |
| localizador barcos | 5.400 | LOW | MarineTraffic (pos 6), VesselFinder |
| buscador de barcos | 1.900 | LOW | MarineTraffic (pos 5) |
| ais barcos | 2.400 | LOW | MarineTraffic (pos 4) |

La página `/maritimo/buques/[slug]` ya existe con MMSIs. El gap es SEO onpage: falta schema `SeaBodyOfWater`, falta enriquecimiento de metadatos con destino/ETA/estado actual en el title.

---

### Cluster 6 — SEGURIDAD / SASEMAR

Vol bajo (<1K/mes), pero es un diferenciador editorial potente. La colección `sasemar` en el stack provee emergencias marítimas activas en tiempo real. Nadie en España tiene una página SEO que consolide rescates activos, zonas de búsqueda, y alertas de seguridad marítima. La `/maritimo/seguridad` ya existe — necesita contenido editorial + schema `SpecialAnnouncement`.

---

### Cluster 7 — METEO MARINO

Cruzado con `/maritimo/meteorologia` ya existente. Vol modesto per se, pero alto como contexto para páginas de ruta (condiciones de navegación en la ruta Barcelona–Mallorca). Mantener como sección adjunta, no como objetivo primario.

---

### Cluster 8 — CRUCEROS

| Keyword | Vol/mes | CPC | KD |
|---|---|---|---|
| crucero islas griegas | 22.200 | €0.84 | HIGH |
| cruceros desde Barcelona | 14.800 | €1.07 | HIGH |
| cruceros baratos | 9.900 | €1.17 | HIGH |
| cruceros última hora | 8.100 | €1.07 | HIGH |
| cruceros desde Valencia | 8.100 | €0.98 | HIGH |

KD HIGH en todo el cluster, saturado por OTAs de cruceros (msc.com, costacruises.com, royalcaribbean.com, viajes el corte inglés). **No compete.** Oportunidad puntual: "cruceros Barcelona hoy" = qué crucero está en puerto ahora (intent tracking, no booking).

---

### Cluster 9 — INFRAESTRUCTURA NÁUTICA

Vol bajo, pero capturado por la `/maritimo/combustible` ya existente (combustible náutico en puertos). Potencialmente: precios de combustible náutico por puerto, diferencial tierra vs marina.

---

### Cluster 10 — PT FERRY

Portugal tiene un cluster propio de ferry con volumen relevante:

| Keyword | Vol/mes | CPC | KD |
|---|---|---|---|
| ferry Tróia Setúbal | 4.400 | €0.38 | LOW |
| ferry Tróia Setúbal preços 2025 | 1.900 | €1.49 | LOW |
| ferry Setúbal Tróia horários | 590 | — | LOW |
| ferry Setúbal Tróia preços carro | 480 | — | LOW |
| ferry boat Forte da Barra Aveiro | 1.300 | €3.81 | LOW |
| ferry Faro | 1.900 | €0.65 | LOW |
| ferry Ayamonte (PT) | 210 | — | LOW |
| ferry Açores | 390 | — | LOW |

KD LOW en todo el cluster PT. Atlantic Ferries domina el SERP Setúbal–Tróia (wave4: pos 1–2). Oportunidad afiliada secundaria: links a Atlantic Ferries + viaverde.pt.

---

## 2. Análisis SERP por Cluster — Competencia Real

### TRACKING: "barcos tiempo real" (22.6M resultados, no AI Overview)

| Pos | Dominio | Tipo | ES? | Real-time? | Libre? |
|---|---|---|---|---|---|
| 1 | vesselfinder.com | AIS tracker | No (EN) | Sí | Parcial (paywall histórico) |
| 2 | sailingheaven.org | Tabla AIS | Parcial | Sí (tabla) | Sí |
| 3 | marinetraffic.live | Clon/espejo MT | No (EN) | Parcial | Sí |
| 4 | ieo.es | IEO oceanográfico | Sí | Sí | Solo IEO |
| 5 | play.google.com | App store | — | — | — |
| 6 | salvamentomaritimo.org | Web institucional | Sí | Widget básico | Sí |
| 8 | interseas.es | Blog listicle | Sí | No | — |
| 10 | marinetraffic.com | AIS + paywall | No (EN) | Sí | Paywall |

**Veredicto:** SERP sin solución nativa española gratuita con mapa + contexto portuario. trafico.live tiene la infraestructura completa: AIS continuo (10.9K pos/min), voyage detector, 197 SpanishPorts, ferry GTFS. El gap es onpage y contenido.

### BOOKING: ferry a Ibiza / ferry a Mallorca

| Pos | Dominio | Modelo |
|---|---|---|
| 1 | balearia.com | Naviera directa (booking nativo) |
| 2 | directferries.es | OTA agregadora |
| 3 | clickferry.com | Comparador ES |
| 4–5 | trasmed.com, logitravel.com | Naviera + OTA |

**Veredicto:** Sin opción orgánica realista. Afiliado es el único modelo viable.

### HORARIO: "próximo ferry" (14.8K, LOW KD, CPC €2.72)

No hay SERP capturado en wave4 para esta keyword exacta, pero el patrón es claro: ninguna web ofrece "el próximo ferry que sale" en tiempo real. Las navieras tienen horarios estáticos. El CPC €2.72 indica que Google sabe que hay intent transaccional detrás pero nadie ha conquistado el espacio informacional con datos dinámicos.

### PUERTOS: "puerto de Algeciras" / "puerto de Valencia"

Dominado por autoridades portuarias + Wikipedia. Zero AI Overview en ambos. Sin ningún resultado de third-party con datos de tráfico en tiempo real (AIS, entradas/salidas hoy).

---

## 3. White Space — El Hueco Tracking + Stats + Contexto

### Evidencia directa

1. **SERP "barcos tiempo real":** ningún resultado español gratuito con mapa AIS interactivo, contexto Spain-first.
2. **"próximo ferry" 14.8K, LOW KD, CPC €2.72:** zero competencia con datos dinámicos. Las navieras no tienen SEO en este patrón.
3. **PAA "¿Qué hay en el puerto de Valencia hoy?"** — pregunta sin respuesta en los 10 primeros resultados.
4. **MarineTraffic en posición 5–10** para keywords españolas ("localización barcos", "ais barcos") — no está optimizando el mercado ES activamente. Sus URLs son EN, su UX es EN-first.
5. **SERP "puerto de Algeciras":** cero resultados de terceros con datos de tráfico portuario real. Pos 1 es apba.es (institucional, sin tiempo real). Pos 2 es Wikipedia.
6. **AI Overview ausente** en todos los SERPs de tracking marítimo: señal de que Google no tiene respuesta satisfactoria y no ha activado AI mode.

### Lo que trafico.live tiene y nadie más tiene (en español)

| Activo | Ventaja competitiva |
|---|---|
| AIS continuo (aisstream.io) — 10.9K posiciones/min | Única fuente hispana gratuita con cobertura total ES+Estrecho+Canarias |
| Voyage detector (hourly) — PortCalls + Voyages | Historial de llamadas a puerto, no solo posición puntual |
| 197 SpanishPort con polígonos INSPIRE | Resolución semántica de "qué hay en el puerto X ahora" |
| Ferry GTFS (Fred Olsen, Baleària, Vizcaya) | Horarios reales para cruzar con posición AIS → status live |
| SASEMAR emergencias activas | Ningún SEO lo tiene en español |
| 48h rolling VesselPosition buffer | Historial reciente consultable sin paywall |

**La combinación AIS continuo + ferry GTFS + voyage detector permite responder en tiempo real:** "¿El ferry de Baleària de las 22:00 Barcelona–Palma ya ha salido? ¿Lleva retraso? ¿Dónde está ahora?" — Eso no existe en ES actualmente.

---

## 4. Estrategia Dual: Afiliado vs. Orgánico

### Landings AFILIADO (no competir por ranking booking)

**Modelo:** Página de ruta con comparador de precio embebido (deeplink DirectFerries/Ferryhopper/Omio) + contexto real-time exclusivo de trafico.live como diferenciador que justifica el tráfico.

**Flujo:** El usuario llega buscando "ferry Barcelona Mallorca" → la OTA lo captura, trafico.live no. Pero si llega buscando "ferry Barcelona Mallorca retraso hoy" o "ferry Balearia Barcelona Mallorca dónde está" → trafico.live SÍ puede rankear (KD LOW, sin competencia).

**Programas de afiliados disponibles:**
- **DirectFerries:** tiene programa de afiliados documentado (API de búsqueda + widget + deeplinks). CPA variable por ruta.
- **Ferryhopper:** programa propio, orientado a Mediterráneo E-SE.
- **Omio:** programa de afiliados masivo, tiene ferries en catálogo.
- **Clickferry.com / Aferry.com:** programas de afiliados activos.
- **Navieras directas** (Baleària, Fred Olsen, Trasmediterránea): no tienen programas de afiliados públicos robustos, redirigen a sus booking engines.

**Nota sobre scraping:** Técnicamente viable (HTML públicamente accesible), pero legalmente arriesgado sin acuerdo. Los T&C de Baleária y DirectFerries prohíben scraping sistemático de precios. **Usar APIs de afiliado, no scraping.** DirectFerries API sí provee precios en tiempo real como parte del programa. Alternativa: mostrar rango histórico de precios desde datos propios (CNMC no cubre ferries) + deeplink a la fuente.

### Landings ORGÁNICO (ranking realista 0–6 meses)

Solo perseguir intents donde trafico.live tiene ventaja técnica exclusiva:

1. **Tracking buques individuales** — `/maritimo/buques/[slug]` ya existe, mejorar SEO
2. **Status ferry en tiempo real** — páginas nuevas cruzando AIS + ferry GTFS
3. **Puertos: qué hay hoy** — `/maritimo/puertos/[slug]` ya existe, añadir datos AIS dinámicos
4. **Radar/mapa AIS en español** — `/maritimo/mapa` optimizado
5. **"Próximo ferry"** — landing temporal que resuelva el intent dinámico

---

## 5. Landings Prioritizadas (15)

| # | URL | Keyword objetivo | Vol/mes | Intent | Tipo | Stack data | Schema | Blocker |
|---|---|---|---|---|---|---|---|---|
| 1 | `/maritimo/mapa` | radar barcos, barcos tiempo real, localizar barcos | 5.400+1.900+880 | TRACKING | Orgánico | AIS stream, 197 SpanishPort | `Map`, `Dataset` | Onpage: title/meta optimización |
| 2 | `/maritimo/buques/[slug]` | [nombre buque], [mmsi] tracker | ~12K (vessel names EN) | VESSEL ID | Orgánico | Vessel, VesselPosition, Voyage | `Vehicle` (`waterVehicle`) | ISR revalidation + schema |
| 3 | `/maritimo/ferries/proximo` | próximo ferry | **14.800** | HORARIO | Orgánico | FerryRoute + FerryTrip GTFS, AIS cross | `Event` (DepartureArrival) | Nueva página — datos GTFS frescos |
| 4 | `/maritimo/ferries/[origen]-[destino]/hoy` | ferry [ruta] hoy, horario ferry [ruta] | ~2K–6K/ruta | HORARIO | Orgánico | FerryRoute+FerryTrip+VesselPosition | `Event`, `ItemList` | Nueva página, 20–30 rutas prioritarias |
| 5 | `/maritimo/puertos/[slug]/movimientos-hoy` | barcos en puerto [X] hoy, puerto [X] tráfico | ~22K+27K+33K (puertos top) | PUERTO | Orgánico | SpanishPort + PortCall + Voyage | `Dataset`, `SpecialAnnouncement` | Añadir sección dinámica a `/puertos/[slug]` |
| 6 | `/maritimo/ferries/[naviera]/estado` | balearia ferry estado, fred olsen retraso, trasmed hoy | ~9.9K+880 | TRACKING | Orgánico | AIS + FerryRoute GTFS match | `Dataset` | Nueva página, 3 navieras (Balearia, FredOlsen, Trasmed) |
| 7 | `/maritimo/ferries/[slug]` (actualizar) | ferry [ruta] horario, ferry [origen] [destino] | 2.400–12.100/ruta | HORARIO+BOOKING | Afiliado+Orgánico | FerryRoute+FerryStop+FerryTrip + deeplink | `BusTrip`/`Schedule` | Añadir deeplink afiliado + AIS status |
| 8 | `/maritimo/ferries/[origen]-[destino]/precio` | ferry [ruta] precio, ferry [ruta] barato | 720–8.100/ruta | BOOKING | Afiliado | DirectFerries API widget / deeplink | `Offer` | Acuerdo afiliado DirectFerries |
| 9 | `/maritimo/puertos/[slug]` (actualizar) | puerto de [X] | 22K–33K | PUERTO INFO | Orgánico | SpanishPort + PortCall + Voyage + AIS | `Place`, `Dataset` | Enriquecer páginas existentes con live widget |
| 10 | `/maritimo/seguridad` (actualizar) | sasemar, emergencia maritima, buques rescate | <1K | SEGURIDAD | Orgánico | SASEMAR feed activo | `SpecialAnnouncement` | Enriquecer página existente |
| 11 | `/maritimo` (hub actualizar) | trafico maritimo, maritimo en directo | ~22K+ | HUB | Orgánico | Todo el stack | `WebPage`, `Dataset` | Onpage: hero con mapa live |
| 12 | `/maritimo/buques/tipo/ferry` | barcos ferry en tiempo real, ferries en directo | ~1.9K | TRACKING | Orgánico | VesselPosition filtrado shipType 60–69 | `ItemList` | Ya existe la ruta, optimizar |
| 13 | `/maritimo/ferries/algeciras-ceuta/hoy` | ferry Algeciras Ceuta hoy, próximo ferry Ceuta | 6.600+1.300 | HORARIO | Orgánico | FerryTrip+AIS cross (Balearia+Armas) | `Event` | Datos GTFS Armas pendiente |
| 14 | `/maritimo/ferries/barcelona-palma/hoy` | ferry Barcelona Mallorca hoy, próximo ferry Mallorca | 8.100+variantes | HORARIO | Orgánico | FerryTrip+AIS Balearia+Trasmed | `Event` | Datos GTFS completos |
| 15 | `/maritimo/combustible` (actualizar) | combustible náutico, gasoil marino, precio gasoil barco | ~2K | INFRAESTRUCTURA | Orgánico | maritime-fuel collector | `Product`/`Offer` | Ya existe, añadir comparativa por puerto |

### Notas críticas de implementación

**`/maritimo/ferries/proximo`** — La keyword "próximo ferry" tiene intent temporal claro: el usuario quiere el siguiente ferry que sale, probablemente desde un puerto cercano a él. Implementación ideal: detección de ubicación (geolocalización JS) → muestra próximos ferries desde puertos cercanos ordenados por hora de salida. SSR con ISR 5 minutos. El FerryTrip GTFS + cruce AIS da la posición actual del buque asignado al trip.

**`/maritimo/ferries/[origen]-[destino]/hoy`** — 20–30 rutas prioritarias (Algeciras–Ceuta, Algeciras–Tánger, Barcelona–Palma, Valencia–Ibiza, Dénia–Ibiza, Dénia–Formentera, Las Palmas–Tenerife, Tenerife–La Gomera, etc.). Cada página: tabla de salidas del día + status AIS del buque asignado + deeplink afiliado para comprar billete.

**`/maritimo/puertos/[slug]/movimientos-hoy`** — Subpágina de los 10 puertos con mayor tráfico. Datos: PortCalls de las últimas 24h (voyage detector), buques actualmente en zona (AIS), próximas entradas estimadas. Schema `Dataset` + `ItemList`.

---

## 6. Pricing Scrape & Afiliado

### Viabilidad técnica de scraping de precios

**Técnicamente:** Las páginas de búsqueda de Baleária, DirectFerries, y Clickferry son HTML renderizado server-side (no SPAs complejas). Scraping técnico es posible.

**Legalmente:** Los T&C de Baleária (balearia.com/es/legal) y DirectFerries prohíben explícitamente scraping sistemático sin permiso escrito. El uso sin acuerdo expone a reclamaciones de infracción de T&C y potencialmente a competencia desleal. **No recomendado.**

### Alternativas viables

1. **DirectFerries Partner API** — DirectFerries tiene programa de afiliados con API de disponibilidad y precios. Comisión por booking completado. Contacto: partner@directferries.com. Cobertura: Baleária, Trasmed, Fred Olsen, Armas, GNV, Grimaldi.
2. **Ferryhopper Affiliate** — Enfocado en Mediterráneo, Canarias. Widget embebable. Contacto vía su web.
3. **Omio** — Tiene ferries en catálogo, programa de afiliados con tracking CPA. API de búsqueda disponible.
4. **Aferry.com** — Programa de afiliados con deeplinks.

### Modelo recomendado

No mostrar precios en tiempo real scrapeados. En su lugar:

- **Rango histórico:** "Precio habitual: 35–85€ por persona" (dato editorial, no scrapeado)
- **CTA afiliado:** "Ver precios y disponibilidad en DirectFerries →" (deeplink con tracking)
- **Valor añadido exclusivo:** estado en tiempo real del buque AIS — esto es lo que el usuario NO puede obtener en DirectFerries

---

## 7. Roadmap Marítimo (3 Fases)

### Fase 1 — Tracking y hueco horario (0–6 semanas)

**Objetivo:** Capturar el espacio "tracking" y "próximo ferry" donde KD es LOW y hay cero competencia real en español.

1. **Onpage `/maritimo/mapa`:** Title → "Radar de barcos España en tiempo real | trafico.live". Meta description con keywords "barcos tiempo real, radar barcos, localizar barcos navegando". Schema `Map` + `Dataset`. Canonical correcto.
2. **Onpage `/maritimo/buques/[slug]`:** Añadir nombre del buque + destino actual + velocidad al `<title>` dinámico. Schema `Vehicle` con `vehicleType: "Ship"`, mmsi, flag, imo. Las páginas ya existen (`src/app/maritimo/buques/[slug]/page.tsx`), falta el schema JSON-LD estructurado.
3. **Nueva página `/maritimo/ferries/proximo`:** Intent "próximo ferry" 14.8K vol, KD LOW, CPC €2.72. Landing con geolocalización JS + FerryTrip GTFS ordenado por departsAt. ISR 5 min. Schema `ItemList` de `BusTrip`-like events.
4. **Nuevas páginas `/maritimo/ferries/[origen]-[destino]/hoy`** (top 10 rutas): Algeciras–Ceuta, Algeciras–Tánger, Barcelona–Palma, Valencia–Ibiza, Dénia–Ibiza, Dénia–Formentera, Las Palmas–Tenerife, Tenerife–Gomera, Palma–Ibiza, Setúbal–Tróia (PT).

**Archivos críticos:**
- `src/app/maritimo/buques/[slug]/page.tsx` — enriquecer schema y title
- `src/app/maritimo/ferries/[slug]/page.tsx` — añadir AIS status del buque
- `src/app/maritimo/mapa/page.tsx` — onpage SEO

### Fase 2 — Puertos + estado navieras (6–12 semanas)

**Objetivo:** Construir autoridad en el cluster PUERTO y lanzar landings de estado por naviera.

5. **Enriquecer `/maritimo/puertos/[slug]`** con sección live: "Buques en puerto ahora" (AIS via SpanishPort ≤10nm), "Últimas entradas/salidas" (PortCall + Voyage, últimas 24h). Cubre intent "barcos en puerto X" y "qué hay en el puerto de X hoy".
6. **Nueva sección `/maritimo/ferries/[naviera]/estado`** para Baleária, Fred Olsen, Trasmediterránea. Cruza AIS + FerryRoute GTFS para mostrar estado de cada buque de flota. Cubre intent "balearia ferry estado", "fred olsen retraso hoy".
7. **Integrar deeplinks afiliado** en `/maritimo/ferries/[slug]` y páginas de ruta `/hoy`. DirectFerries API o deeplink simple con parámetros origen/destino/fecha.

**Archivos críticos:**
- `src/app/maritimo/puertos/[slug]/page.tsx` — añadir sección AIS live
- `src/app/maritimo/ferries/[slug]/page.tsx` — añadir estado naviera + afiliado
- `services/collector/tasks/ferry-gtfs/` — verificar cobertura Armas + DFDS

### Fase 3 — Autoridad editorial + Portugal (12–24 semanas)

**Objetivo:** Consolidar posiciones, atacar PT, construir link equity con contenido editorial.

8. **Cluster PT ferry:** Páginas `/maritimo/ferries/setubal-troia/hoy`, `/maritimo/ferries/faro/hoy`. Atlantic Ferries y viaverde.pt son competencia débil. Volumen PT ferry total ~10K/mes, KD LOW.
9. **Contenido editorial "Cómo funciona el AIS"** — responde queries tipo "¿qué es AIS barcos?", "radar de barcos cómo funciona", atrae links entrantes de blogs náuticos.
10. **Estadísticas de puertos** — "/maritimo/puertos/[slug]/estadisticas" con tráfico histórico (voyage detector acumulado), top rutas, top navieras por puerto. Datos únicos que ninguna fuente pública española consolida.
11. **Sección cruceros informacional** — "cruceros en Barcelona hoy" (qué crucero está en puerto hoy, datos AIS de cruise ships). Volumen 14.8K (cruceros Barcelona), KD HIGH para booking pero LOW para tracking de cruceros en puerto.

**Archivos críticos:**
- `services/collector/tasks/voyage-detector/` — verificar acumulación de PortCalls para estadísticas históricas
- `services/collector/tasks/ais-stream/` — verificar ship_type 60–69 (passenger/ferry) y 80 (tanker) para segmentación

---

## Resumen de prioridades

| Prioridad | Acción | Impacto | Esfuerzo | Datos |
|---|---|---|---|---|
| P0 | Onpage `/maritimo/mapa` — title/schema | Tracking 8.3K vol | 1 día | Ya existe |
| P0 | Schema vessel pages `/buques/[slug]` | Vessel ID cluster | 1 día | Ya existe |
| P1 | Nueva landing `/ferries/proximo` | 14.8K vol, LOW KD | 3 días | FerryTrip GTFS |
| P1 | Páginas `/ferries/[origen]-[destino]/hoy` (top 10) | 2–8K/ruta, LOW KD | 1 semana | FerryTrip + AIS |
| P2 | Live widget puertos `/puertos/[slug]` | 22–33K/puerto | 1 semana | PortCall + AIS |
| P2 | Páginas estado naviera | 9.9K+880 vol | 3 días | AIS + FerryRoute |
| P3 | Deeplinks afiliado DirectFerries | CPA revenue | 1 semana | API afiliado |
| P3 | PT ferry cluster | ~10K vol PT | 1 semana | FerryTrip GTFS |

**Archivos más críticos para esta fase:**
- `/Users/mj/Desarrollos/trafico.live/src/app/maritimo/buques/[slug]/page.tsx` — schema enriquecido
- `/Users/mj/Desarrollos/trafico.live/src/app/maritimo/ferries/[slug]/page.tsx` — AIS status + afiliado
- `/Users/mj/Desarrollos/trafico.live/src/app/maritimo/mapa/page.tsx` — onpage tracking
- `/Users/mj/Desarrollos/trafico.live/services/collector/tasks/ferry-gtfs/` — cobertura Armas/DFDS
- `/Users/mj/Desarrollos/trafico.live/src/app/maritimo/puertos/[slug]/page.tsx` — live widget AIS
