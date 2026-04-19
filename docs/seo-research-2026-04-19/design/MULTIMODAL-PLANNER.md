# Multimodal Route Planner — Blueprint Sprint 6

**Fecha:** 2026-04-19  
**Sprint objetivo:** 6 (post ciudad-hubs)  
**Redacción:** basado en codebase real en `/Users/mj/Desarrollos/trafico.live`  
**Namespace canónico:** `/ruta/[origen]/[destino]` — `/ir/*` y `/viaje/*` redirigen aquí (ya reservados por T1.9)

---

## 1. Problem statement & user intents

Rome2Rio tiene ~12M visitas/mes globales, opera en inglés, y no tiene datos de peajes españoles, precios CNMC ni delays Renfe en tiempo real. Google Maps compara tiempo pero no coste total. Nadie en español responde las cinco preguntas siguientes de forma integrada:

| Job | Intent canónico | Vol. estimado ES | KD |
|-----|----------------|------------------|----|
| J1 — Comparativa total | "madrid barcelona como ir" | 9.9K/mes | 2 |
| J2 — AVE vs vuelo | "ave o avion madrid barcelona" | 3.2K/mes | 8 |
| J3 — EV routing | "ruta coche electrico cargadores" | 1.1K/mes | 4 |
| J4 — Cadena multimodal | "ave madrid hotel centro metro" | 800/mes | 3 |
| J5 — Tiempo real ajustado | "ruta sin atasco madrid barcelona ahora" | 2.4K/mes | 5 |

La cola larga "como llegar [X] desde [Y]" agrega 300-600K/mes ES con KD 0-8 según análisis en `docs/seo-research-2026-04-19/03-keyword-universe.md`.

---

## 2. Graph data model

**Decisión:** Postgres + PostGIS. No añadir un graph DB. Los datos ya están modelados y las queries necesarias son joins planos con índices GIST, no traversals de profundidad arbitraria.

### Nodes (entidades ya en Prisma)

| Node type | Modelo Prisma | Campos clave |
|-----------|--------------|--------------|
| Ciudad/municipio | lookup en `od-pairs.ts` (50 ciudades, lat/lon) | slug, name, province, lat, lon |
| Estación tren | `RailwayStation` | slug, lat, lon, province, network |
| Aeropuerto | `Airport` | iataCode, lat, lon, province |
| Puerto / ferry stop | `FerryStop` | name, lat, lon |
| Parada tránsito | `TransitStop` | stopId, lat, lon, operatorId |
| Cargador EV | `EVCharger` | id, lat, lon, connectorType, maxKw |

### Edges (modos de transporte)

| Edge | Motor | Peso principal | Estado |
|------|-------|---------------|--------|
| Coche | OSRM `car` profile (`trafico-osrm-car:5000`) | duration + fuel cost + peajes | Operativo (S0) |
| AVE/Tren | OTP2 sobre GTFS Renfe | duration + fare estimate | Operativo (S1) |
| Metro/bus urbano | OTP2 sobre GTFS locales (15+ feeds) | duration + fare fija | Operativo (S1) |
| Ferry | OTP2 sobre `FerryTrip` / `FerryRoute` | duration + fare estimate | Operativo S1 |
| Vuelo | **ver §11 — excluido v1** | — | Sprint 7 |
| A pie | OSRM `foot` profile | duration | Operativo (S0) |
| Bicicleta | OSRM `bike` profile | duration | Operativo (S0) |

No se materializa un grafo explícito en BD: el planner pide en paralelo OSRM y OTP y agrega resultados en `/api/ruta` (ver §8).

---

## 3. Cost function

Cada itinerario recibe un score escalar. El usuario elige un perfil que ajusta los pesos `w_i` (DEFAULT: "equilibrado").

```
score = w_time × t_min
      + w_price × price_eur
      + w_co2 × co2_kg
      + w_comfort × (1 − comfort_index)   // comfort_index ∈ [0,1]
      + w_reliability × (1 − reliability) // reliability ∈ [0,1]
```

| Perfil | w_time | w_price | w_co2 | w_comfort | w_reliability |
|--------|--------|---------|-------|-----------|---------------|
| `fastest` | 0.50 | 0.20 | 0.10 | 0.10 | 0.10 |
| `cheapest` | 0.15 | 0.55 | 0.10 | 0.10 | 0.10 |
| `greenest` | 0.15 | 0.15 | 0.55 | 0.05 | 0.10 |
| `balanced` (DEFAULT) | 0.30 | 0.30 | 0.20 | 0.10 | 0.10 |

**Campos visibles en página** (E-E-A-T signal, usuarios y LLMs pueden citar):

- `t_min`: duración total en minutos (OTP `itinerary.duration / 60` o OSRM `route.duration / 60`)
- `price_eur`: peajes (de `matchTollsFromRoute` en `src/lib/tolls.ts`) + combustible (`fuelCost()` en `src/lib/fuel-cost.ts`) para coche; `fare.amount` de OTP para tren/bus/ferry
- `co2_kg`: `co2ForLeg()` de `src/lib/multimodal.ts` (ya implementado, g/pax-km por modo y por marca)
- `comfort_index`: derivado de número de transbordos (`transfers`) y distancia caminada (`walkDistance`)
- `reliability`: para AVE se calcula desde `RailwayDailyStats` (puntualidad histórica); coche usa inverso de tasa de incidentes en el corredor

La fórmula se muestra explícitamente en la página — esto es citable por AI Overview y refuerza E-E-A-T.

---

## 4. Data sources por modo

### Coche

- **Routing:** OSRM self-hosted `trafico-osrm-car:5000` (ya desplegado S0). Sin Mapbox. OSRM es gratuito, latencia P95 < 120 ms para rutas < 500 km — suficiente para SSG + ISR.
- **Peajes:** `src/lib/tolls.ts` + `data/tolls.json` (2026 tariffs, SEITT per-km + roads fijas). Match via `matchTollsFromRoute()` sobre refs OSRM step. Cubre AP-6, AP-7, AP-68, C-32, AP-4, AP-2, AP-36, R-2/3/4/5, M-12 y otros ~20 peajes principales.
- **Combustible:** `getFuelPrice()` de `src/lib/fuel-cost.ts` → tabla `CNMCFuelPrice` (diaria, 52 provincias desde 2016). Se usa el precio de la provincia origen.
- **Consumo default:** 7.5 L/100km gasolina, 6.5 L/100km diesel. Usuario puede editar (input numérico).
- **EV:** mismo OSRM para la ruta + `EVCharger` table para stops de carga. Consumo default: 18 kWh/100km. Precio electricidad: 0.24 €/kWh (no tenemos live — hardcodeado con nota de fuente).

### AVE / Renfe

- **Horarios:** OTP2 sobre GTFS Renfe (Cercanías + AVE/LD). `RailwayStation` (1.506 estaciones), `RailwayRoute` (1.248 rutas). OTP devuelve `itinerary.legs` con `startTime`/`endTime` reales.
- **Precio:** No hay API pública de billetes. Estrategia v1: estimación por km usando tarifas medias históricas (AVE ~0.14 €/km; MD ~0.06 €/km; Cercanías 0.05 €/km) — etiquetado como `estimated: true` en `MultimodalItinerary.fare`. Trainline deep-link afiliado para precio real.
- **Retraso medio:** `RailwayDailyStats` — mostrar "puntualidad media AVE Madrid-Barcelona: 94%" con fecha de cálculo.

### Ferry

- `FerryRoute`, `FerryStop`, `FerryTrip` — Baleària, Trasmediterránea, Fred. Olsen, Vizcaya, GNV.
- OTP2 usa el GTFS ferry. Precio: DirectFerries deep-link afiliado (`src/lib/affiliates/directferries.ts` — ya existe).

### Bus interurbano

- FlixBus GTFS (via MobilityData sync). OTP2 lo incluye automáticamente.
- Deep-link FlixBus afiliado (`src/lib/affiliates/flixbus.ts` — ya existe).

### Tránsito urbano (cadenas multimodales)

- 15+ GTFS feeds: Metro Madrid, TMB Barcelona, EMT, TUSSAM, Metro Bilbao, FGC, Euskotren.
- OTP2 los integra para legs de primer/último kilómetro.
- Precio: tarifa fija por red (T-Casual Barcelona 1.12€; 10 viajes Metro Madrid 12.20€).

### Vuelos — excluido de v1

Skyscanner Affiliate API requiere partnership aprobado (proceso 4-6 semanas). Web scraping es legalmente inviable. Vuelo se incluye como fila en la tabla con CTA "Buscar vuelo en Skyscanner" (deep-link afiliado genérico, sin precio) + tiempo estimado por haversine + 2h aeropuerto. Se marca explícitamente `price_eur: null`. **Datos reales de vuelos: Sprint 7, condicionado a aprobación Skyscanner.**

---

## 5. Emissions model

Fuentes: MITECO (Inventario GEI), EEA (European Environment Agency, transport emissions 2023).

| Modo | gCO2/pax-km | Fuente |
|------|-------------|--------|
| Coche (media 1.5 ocp.) | 80 g | EEA 2023 (120g solo conductor ÷ 1.5) |
| AVE | 14 g | MITECO/Adif 2023 (mix eléctrico español) |
| Alvia / MD / Regional | 40 g | EEA + MITECO blend |
| Bus interurbano | 68 g | EEA 2023 |
| Ferry | 115 g | EEA 2023 short-sea |
| Metro | 35 g | MITECO (mezcla Renfe + mix red eléctrica) |
| Avión (estimado) | 255 g | EEA 2023 short-haul Intraeuropeo |

Ya implementado en `src/lib/multimodal.ts` (`co2ForLeg()`, líneas 126-136) con refinamiento por marca (`CO2_BRAND_FACTORS`, líneas 42-62). Para el coche se calcula como:

```
CO2_car_g = distancia_km × (consumo_L/100km / 100) × 2.392 kg_CO2/L_gasolina × 1000
```

Factor 2.392 kg CO2/L según MITECO. Se muestra la fórmula en la página.

---

## 6. URL structure

```
/ruta/[origen]/[destino]          ← canónico (SSG top 300 pares, ISR 1h resto)
/ir/[origen]/[destino]            ← redirect 301 → /ruta/[origen]/[destino]
/viaje/[origen]/[destino]         ← redirect 301 → /ruta/[origen]/[destino]
```

Slugs generados por `slugifyCity()` de `src/lib/ir-slug.ts` (ya implementado).

**SSG static (300 pares):** top 50 ciudades de `src/lib/od-pairs.ts` × bidireccional, ordenadas por volumen de búsqueda estimado. Los 50×49 = 2.450 pares bidireccionales se generan con `getAllODPairs()` — SSG diario solo para los 300 con mayor volumen (aprox. top 6 ciudades × resto).

**ISR 1h:** todo el resto de pares + cualquier slug con coordenadas válidas pero fuera del top 300.

**`generateStaticParams()`:** top 300 hardcodeados como array en `src/app/ruta/[origen]/[destino]/page.tsx`. Revalidación `revalidate = 3600`.

Ejemplos:
- `/ruta/madrid/barcelona`
- `/ruta/sevilla/palma`
- `/ruta/bilbao/donostia`

---

## 7. Page template

### Hero — tabla comparativa

```
Modo        | Duración   | Precio est. | CO2    | CTA
------------|------------|-------------|--------|------------------
Coche       | 6h 15m     | 74€         | 108g   | [Ver ruta en mapa]
AVE         | 2h 30m     | ~110€ est.  | 14g    | [Buscar en Trainline ↗]
Bus         | 7h 45m     | 32€         | 68g    | [Buscar en FlixBus ↗]
Ferry       | N/D        | N/D         | —      | [ver si aplica]
Vuelo       | ~3h total  | ver precio  | 255g   | [Buscar en Skyscanner ↗]
```

Ordenación por perfil seleccionado (buttons: Más rápido / Más barato / Más verde).

### Sección coche

- Mapa OSRM con ruta trazada (MapLibre, ya en `src/app/ruta/content.tsx`)
- Desglose: distancia × km + peajes por carretera (tabla `TollMatch`) + combustible × litros
- Panel "Alternativa sin peajes": si existe `freeAlternative` en `data/tolls.json`, mostrar opción con `+X min / -Y€`
- Badge "Atasco ahora": si `TrafficIncident` activo en el corredor → "+20 min estimados" (cross con `/api/trafico/intensidad`)

### Sección AVE/tren

- Próximas salidas (OTP, hasta 3 itinerarios)
- Puntualidad media del corredor (desde `RailwayDailyStats`)
- CTA Trainline con deep-link a búsqueda prellenada origen-destino-fecha

### Sección "¿Cuándo es más barato?"

- **Coche:** gráfica 30 días precio combustible CNMC (desde `CNMCFuelPrice`). "Hoy el diésel está X€/L vs media 30d de Y€/L"
- **AVE:** texto estático basado en regla: "el AVE suele ser más barato los martes y miércoles; los viernes y domingos hasta 40% más caro" (no tenemos precios históricos AVE propios, se cita fuente externa)
- **Vuelos:** N/A en v1

### Ajuste tiempo real

- Incidencias activas en el corredor: query `TrafficIncident` con PostGIS `ST_DWithin` de la polyline OSRM
- Si incidencia activa → badge naranja "+ X min estimados" con enlace a `/incidencias/[id]`

### Afiliados

- Trainline: `src/lib/affiliates/trainline.ts` (ya existe) — deep-link a búsqueda AVE prellenada
- Skyscanner: `src/lib/affiliates/skyscanner.ts` (ya existe) — deep-link a búsqueda genérica origin-dest
- DirectFerries: `src/lib/affiliates/directferries.ts` (ya existe) — si hay ruta ferry aplicable
- FlixBus: `src/lib/affiliates/flixbus.ts` (ya existe) — si hay ruta bus en OTP

Todos pasan por `/go/[partner]/[slug]` con registro en `AffiliateClick` (T4.8 infraestructura ya en `src/lib/affiliate.ts`).

---

## 8. API endpoint contract

```
GET /api/ruta?from=madrid&to=barcelona&when=2026-04-20T10:00&profile=fastest
```

Parámetros:
- `from`, `to`: slug ciudad (resuelto a lat/lon via `od-pairs.ts`) o coordenadas `lat,lon`
- `when`: ISO datetime (default: now)
- `profile`: `fastest | cheapest | greenest | balanced` (default `balanced`)
- `modes`: opcional, CSV — `car,rail,bus,ferry` (default all)

Respuesta JSON:

```json
{
  "from": { "name": "Madrid", "lat": 40.4168, "lon": -3.7038 },
  "to": { "name": "Barcelona", "lat": 41.3851, "lon": 2.1734 },
  "date": "2026-04-20",
  "profile": "balanced",
  "options": [
    {
      "mode": "RAIL",
      "label": "AVE · Renfe",
      "durationMin": 150,
      "priceEur": 110.0,
      "priceEstimated": true,
      "co2gPerPax": 14,
      "reliabilityPct": 94,
      "score": 0.312,
      "affiliateUrl": "https://trafico.live/go/trainline/mad-bcn",
      "itinerary": { /* MultimodalItinerary */ }
    },
    {
      "mode": "CAR",
      "label": "Coche · AP-2 / AP-7",
      "durationMin": 375,
      "priceEur": 74.20,
      "priceEstimated": false,
      "tollsEur": 28.50,
      "fuelEur": 45.70,
      "co2gPerPax": 108,
      "score": 0.441,
      "routeGeometry": { /* GeoJSON LineString */ }
    }
  ],
  "trafficAlert": {
    "active": true,
    "description": "Retención en A-2 km 42 dirección Barcelona",
    "extraMinutes": 20
  },
  "generatedAt": "2026-04-20T09:47:00Z"
}
```

Internamente: llamada paralela a OSRM car + `queryOTP()` (ya en `src/lib/multimodal.ts`) + `getFuelPrice()` + `matchTollsFromRoute()`. Timeout 8s total.

---

## 9. Schema.org

```json
{
  "@context": "https://schema.org",
  "@type": "TripAction",
  "name": "Cómo ir de Madrid a Barcelona",
  "fromLocation": {
    "@type": "Place",
    "name": "Madrid",
    "geo": { "@type": "GeoCoordinates", "latitude": 40.4168, "longitude": -3.7038 }
  },
  "toLocation": {
    "@type": "Place",
    "name": "Barcelona",
    "geo": { "@type": "GeoCoordinates", "latitude": 41.3851, "longitude": 2.1734 }
  },
  "subjectOf": [
    {
      "@type": "TravelAction",
      "name": "AVE Madrid - Barcelona",
      "vehicle": { "@type": "Vehicle", "vehicleTransmission": "AVE" },
      "estimatedFlightDuration": "PT2H30M",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "price": "110",
        "availability": "https://schema.org/InStock",
        "url": "https://trafico.live/go/trainline/mad-bcn"
      }
    },
    {
      "@type": "TravelAction",
      "name": "En coche Madrid - Barcelona",
      "vehicle": { "@type": "Vehicle", "vehicleTransmission": "Manual" },
      "estimatedFlightDuration": "PT6H15M"
    }
  ]
}
```

Un bloque `TripAction` por página + un `TravelAction` por modo disponible con `Offer` cuando hay precio o afiliado. Google reconoce esto en rich results de viajes.

---

## 10. Caching strategy

| Tipo de dato | TTL | Mecanismo |
|-------------|-----|-----------|
| Top 300 pares SSG | Revalidación diaria (ISR `revalidate=86400`) | Next.js SSG |
| Resto de pares | ISR 1h (`revalidate=3600`) | Next.js ISR |
| Precio combustible (`getFuelPrice`) | Redis 6h | `src/lib/redis.ts` |
| Resultado OSRM por par origen-destino | Redis 30 min | key: `osrm:car:{from_lat}:{from_lon}:{to_lat}:{to_lon}` |
| Resultado OTP por par + fecha | Redis 15 min | key: `otp:{from}:{to}:{date}` |
| `TrafficIncident` corredor | No cachear — query DB directa | PostGIS real-time |
| `RailwayDailyStats` puntualidad | Redis 24h | agrega por corredor |

Los 300 pares SSG se regeneran en el build nocturno (webhook deploy) con precios combustible del día.

---

## 11. Dependencies flagged

### Bloqueantes para v1

| Dependencia | Estado | Decisión |
|-------------|--------|----------|
| OTP2 operativo con GTFS Renfe | Sprint 1 (semana 21-27 abr) | Bloqueante para modo tren |
| `tolls.json` cobertura completa | Parcial — ~25 peajes, falta AP-7 Catalunya completo | Aceptable para MVP, nota "estimado" |
| `CNMCFuelPrice` tabla populada | OK (collector `cnmc-fuel` diario) | Listo |

### Decisiones arquitectónicas confirmadas

**OSRM vs Mapbox:** OSRM self-hosted. Razones: (1) ya desplegado y operativo en S0, (2) coste cero, (3) latencia P95 < 120ms suficiente, (4) control total sobre perfiles de ruta. Mapbox solo tendría sentido si se necesitara traffic-aware routing en tiempo real para el modo coche — esto se puede añadir en Sprint 7 vía Valhalla con matrix historical data, sin necesidad de Mapbox.

**Graph DB:** Descartado. Postgres + PostGIS cubre el caso de uso — los paths son de profundidad 1-2 (origen → modo → destino), no grafos de conocimiento arbitrarios.

### Sprint 7 backlog (no v1)

- **Vuelos con precios reales:** requiere Skyscanner Partner API (proceso aprobación externo) o Amadeus Self-Service API (€0.01/request). No scraping. ETA: 6-8 semanas tras solicitud.
- **Toll coverage completa:** script de importación BOE peajes + validación anual. Actualmente faltan AP-7 tramo Cataluña, túnel Guadarrama, AP-1.
- **Valhalla time-aware routing para coche:** `trafico-valhalla:8002` ya existe (`src/lib/isochrone.ts`) — extender a routing con `date_time` para reflejar tráfico histórico por hora.
- **Precios reales AVE:** requiere acuerdo Renfe Open Data o scraping con parseo de renfe.com (riesgo TOS).

---

## 12. MVP Sprint 6 — Feature checklist

**20 pares prioritarios** (bidireccionales = 40 páginas SSG):

Madrid → Barcelona, Valencia, Sevilla, Bilbao, Zaragoza, Málaga, A Coruña, Valladolid, Granada, Palma  
Barcelona → Valencia, Sevilla, Zaragoza, Málaga, Bilbao  
Sevilla → Málaga, Cádiz (Jerez), Córdoba  
Valencia → Alicante, Murcia

**Checklist de entregables:**

- [ ] `src/app/ruta/[origen]/[destino]/page.tsx` con SSG para top 20 pares + ISR 1h fallback
- [ ] `src/app/api/ruta/route.ts` — GET handler que agrega OSRM + OTP en paralelo, aplica cost function, devuelve `options[]` ordenados por score
- [ ] `src/lib/ruta-aggregator.ts` — lógica de agregación y scoring (extraída del API handler para testabilidad)
- [ ] Tabla comparativa hero con 5 modos (vuelos con CTA sin precio)
- [ ] Sección coche: desglose peajes + combustible visible
- [ ] Sección tren: próximas salidas OTP + puntualidad desde `RailwayDailyStats`
- [ ] Badge atasco tiempo real cruzado con `TrafficIncident`
- [ ] Afiliados Trainline + FlixBus + DirectFerries (cuando aplica) vía `/go/` handler existente
- [ ] Schema.org `TripAction` + `TravelAction` × modo en `<script type="application/ld+json">`
- [ ] `generateStaticParams()` top 300 pares con `revalidate=86400`
- [ ] Redis cache OSRM (30 min) + OTP (15 min) + fuel price (6h)
- [ ] Redirección `301` desde `/ir/[origen]/[destino]` y `/viaje/[origen]/[destino]` → `/ruta/[origen]/[destino]`
- [ ] OG image dinámica con nombres origen-destino y tabla resumen (via `src/app/ruta/[origen]/[destino]/opengraph-image.tsx`)
- [ ] Tests: 10 rutas smoke (`tests/routing/ruta-smoke.test.ts`) — valida que score correcto y que modo más barato tiene `priceEur` menor

**Criterio de salida Sprint 6:**

- Madrid → Barcelona devuelve ≥ 3 modos con precio y duración en < 3s cold (ISR)
- `/api/ruta?from=madrid&to=barcelona` responde en < 800ms warm (Redis hit)
- 40 páginas SSG indexables y sin error de build
- Al menos 1 click afiliado registrado en `AffiliateClick` en staging

---

## Archivos críticos para Sprint 6

| Archivo | Por qué importa |
|---------|----------------|
| `src/lib/multimodal.ts` | OTP adapter + `co2ForLeg()` + `enrichWithBrand()` — no tocar la interfaz, extender |
| `src/lib/tolls.ts` | `matchTollsFromRoute()` — necesita datos OSRM step refs correctos |
| `src/lib/fuel-cost.ts` | `getFuelPrice()` + `fuelCost()` — ya listo, conectar directamente |
| `src/lib/od-pairs.ts` | Catálogo 50 ciudades con lat/lon — base de `generateStaticParams()` |
| `src/lib/affiliates/index.ts` | Punto de entrada afiliados — usar las 4 integraciones existentes |
| `prisma/schema.prisma` | `RailwayDailyStats`, `TrafficIncident`, `EVCharger`, `FerryRoute` — modelos ya en schema |
| `data/tolls.json` | Datos peajes estáticos — ampliar cobertura antes de Sprint 6 |
| `src/app/api/multimodal/route.ts` | Proxy OTP existente — reutilizar como sub-llamada interna del nuevo `/api/ruta` |
