# trafico.live — Roadmap Routing + Afiliado

**Objetivo:** convertir trafico.live en el **meta-comparador multimodal de España** — "Rome2Rio hecho aquí con datos reales". Tráfico, trenes, aviones, ferries, metro, bus, a pie, todo con precio y botón de reserva afiliado.

**Arranque:** lunes **27 abril 2026** (una semana después del launch del 20 abril)
**Ventana total:** 10 semanas — lanzamiento meta-buscador **6 julio 2026**
**Modalidad:** 6 fases secuenciales con hitos verificables, monetización empieza en semana 4

---

## 1. Visión del producto final

El usuario entra en `/ir/sevilla-palma` (o usa un buscador A→B) y ve una tabla:

| Opción | Tiempo | Coste | CO₂ | Ventana | Reservar |
|---|---|---|---|---|---|
| ✈️ Vuelo directo SVQ→PMI | 1h 20m + 3h aero | 67€ | 120 kg | cada 2h | **Skyscanner →** |
| 🚆 AVE+🛥️ Ferry | 7h 40m | 142€ | 42 kg | 2/día | **Trainline → + DirectFerries →** |
| 🚌+🛥️ Bus+Ferry | 11h 10m | 78€ | 38 kg | 1/día | **FlixBus → + Balearia →** |
| 🚗 Coche+ferry | 9h 30m | 187€ (60€ combustible · 38€ peajes · 89€ ferry) | 110 kg | libre | **DirectFerries →** |

Cada botón lleva nuestro `affiliate_id`. Cada click/conversión = ingreso.

Nadie en España tiene esto bien hecho. Rome2Rio es flojo en datos locales (Cercanías, ferries inter-islas, bus comarcal). Nosotros sí los tenemos.

---

## 2. Scope por fases

### FASE A — OSRM multi-perfil y limpieza (semana 1, 27 abril – 3 mayo)

**Entregable:** 4 selectores de vehículo en `/mapa` funcionando de verdad.

- **A1.** Compilar 3 grafos OSRM en `compute`: `car.lua`, `bicycle.lua`, `foot.lua`. Usar el mismo PBF `iberia.osm.pbf` ya descargado.
- **A2.** Arrancar 3 contenedores `trafico-osrm-car`, `trafico-osrm-bike`, `trafico-osrm-foot` en puertos 5000/5001/5002.
- **A3.** Enrutar en `src/app/api/route/route.ts:6` según `profile` del body → URL del contenedor correcto. Eliminar el `_costing` ignorado de `src/lib/routing.ts:68`.
- **A4.** Borrar `services/valhalla/` del repo (lo recuperamos en fase D con config distinta).
- **A5.** Quitar pestaña "Isócrona" de `RoutingPanel` hasta fase D.
- **A6.** Métricas: P95 < 120 ms para rutas < 500 km en los 3 perfiles.

**Verificación:** 3 rutas de test (coche, bici, a pie) desde Plaza Mayor Madrid a Retiro dan distancias y duraciones distintas y creíbles.

---

### FASE B — Calculadora de viaje en coche completa (semana 2, 4-10 mayo)

**Entregable:** `/calculadora` deja de pedir kilómetros a mano. Usuario escribe origen+destino, ve coste total desglosado.

- **B1.** Añadir autocompletado de origen/destino sobre los 8.131 municipios + 42 aeropuertos + 197 puertos + 1.506 estaciones Renfe (Typesense ya las tiene indexadas).
- **B2.** Calcular ruta con OSRM car, extraer waypoints + duración + distancia.
- **B3.** **Peajes reales:** detectar cruces con `TollSegment.geometry` a lo largo del polyline de la ruta (PostGIS `ST_Intersects`). Sumar `priceLigeros` / `pricePesados1` según tipo vehículo.
- **B4.** **Combustible live:** en vez de precio por defecto del `FUEL_DEFAULTS`, leer `CNMCFuelPrice` del día y provincia de origen.
- **B5.** Añadir 3 alternativas: "ruta más rápida", "evitar peajes" (Valhalla vendrá en D), "más ecológica" (evitar ciudad).
- **B6.** Página SSG por par origen-destino para top 500 pares (`/calculadora/madrid-barcelona`, etc.) — gran gancho SEO.
- **B7.** Widget afiliado lateral: fuel-card (Solred/Way), seguros (Rastreator).

**Verificación:** Madrid→Bilbao devuelve 395 km, 4h, 28,50€ peajes (AP-68), 45,60€ combustible, total 74€. Contrastar con trayectos conocidos.

---

### FASE C — OpenTripPlanner 2 para multimodal (semanas 3-4, 11-24 mayo)

**Entregable:** endpoint `/api/multimodal` que devuelve opciones tren+metro+bus+a pie combinadas.

- **C1.** Añadir `services/otp/` con `docker-compose.yml`. Imagen `opentripplanner/opentripplanner:latest`, ~8 GB RAM, 4 threads.
- **C2.** Script `services/otp/build-graph.sh` que consume:
  - OSM PBF Iberia (ya existe en `/opt/trafico/tiles/build/iberia.osm.pbf`)
  - Todos los GTFS ya descargados en `services/collector/tasks/transit-gtfs/`, `ferry-gtfs/`, `renfe-gtfs/`
  - Reconstrucción semanal vía cron cuando cambian los GTFS
- **C3.** Proxy Next.js en `src/app/api/multimodal/route.ts`: recibe origen/destino/modes/fecha, llama a OTP `/otp/routers/default/plan`, normaliza respuesta.
- **C4.** Tipos TypeScript compartidos: `MultimodalItinerary`, `Leg`, `TransitDetail`.
- **C5.** Endpoint de prueba: Atocha → aeropuerto Madrid debe dar 1) metro L8 directo, 2) Cercanías C-1.

**Verificación:** "Sants → Girona estación" devuelve rutas con AVE (R1) + Renfe MD + bus ALSA (si importado en D). "Gijón centro → Universidad Oviedo" combina bus urbano + Cercanías.

**Nota clave:** OTP no da precios. Los precios vienen en fase E.

---

### FASE D — Valhalla dedicado a isócronas + rutas camión (semana 5, 25-31 mayo)

**Entregable:** páginas "qué hay a 30 min en coche desde X" + routing específico para camiones y mercancías peligrosas.

- **D1.** Recuperar `services/valhalla/docker-compose.yml`, aislarlo: sólo responde a `/isochrone` y `/route` con costing `truck`. OSRM sigue siendo el motor default para auto/bike/ped.
- **D2.** Endpoint `/api/isochrone` que devuelve polígonos GeoJSON 15/30/60 min desde un punto.
- **D3.** Capa de mapa en `/mapa`: click derecho → "isócrona desde aquí".
- **D4.** Páginas SSG de isócronas por capital de provincia: `/isocrona/madrid`, `/isocrona/barcelona` (52 páginas) — keywords "qué visitar a 30 minutos de…", SEO brutal.
- **D5.** Perfil camión parametrizable: altura, peso, longitud, mercancías peligrosas (engancha con `SpeedLimit.vehicleType` que ya tienes).
- **D6.** Vertical B2B `/profesional/camion` con ruta + peajes pesados 1/2 + combustible gasoil + paradas (áreas de servicio).

**Verificación:** isócrona 60 min desde Plaza Cataluña cubre hasta Sitges/Granollers. Ruta camión Valencia→Irún evita túneles con limitación altura.

---

### FASE E — Integraciones afiliado por modo (semanas 6-9, 1 junio – 28 junio)

**Una integración por semana. Orden por ROI esperado.**

#### Semana 6 — Vuelos (Skyscanner)
- **E1.1** Registro Skyscanner Partners, obtener `apiKey` y `affiliateId`.
- **E1.2** Cliente en `src/lib/affiliates/skyscanner.ts`: buscar vuelos O→D fecha, normalizar a tipo `FlightOffer`.
- **E1.3** Server cache Redis 15 min (precios vuelos fluctúan, no caching agresivo).
- **E1.4** Widget `<FlightResults origin dest date>` que se inyecta en multimodal cuando opción tiene leg `FLIGHT`.
- **E1.5** Landing `/vuelo/[origen]-[destino]` para top 200 rutas domésticas.

#### Semana 7 — Trenes (Trainline Partners)
- **E2.1** Registro Trainline Partners (cubre Renfe, OUIGO, Iryo — el Santo Grial para España).
- **E2.2** Cliente `src/lib/affiliates/trainline.ts`: cotización por tren + horario.
- **E2.3** Widget `<TrainResults>` en `/trenes/[brand]` y multimodal.
- **E2.4** Landing `/billete-tren/[origen]-[destino]` para top 300 pares (tu `RailwayRoute` tiene los orígenes y destinos populares).
- **E2.5** Página comparador "AVE vs AVLO vs Iryo Madrid-Barcelona" — comparativa precios + horarios + comodidad.

#### Semana 8 — Ferries (DirectFerries)
- **E3.1** Registro DirectFerries affiliate (Baleària, Fred. Olsen, Trasmed, GNV, Armas).
- **E3.2** Cliente `src/lib/affiliates/directferries.ts`.
- **E3.3** Widget en `/maritimo/ferries/[operator]` y en multimodal.
- **E3.4** Landing `/ferry/[origen]-[destino]` para todas las rutas inter-islas Baleares, Canarias inter-islas, Península-Baleares, Península-Canarias, Algeciras-Tánger.

#### Semana 9 — Bus intercity (FlixBus + BlaBlaCarBus)
- **E4.1** Registro FlixBus Partner + BlaBlaCarBus.
- **E4.2** Import de GTFS de ambos a `TransitRoute` (añadir al collector `transit-gtfs`).
- **E4.3** Cliente `src/lib/affiliates/flixbus.ts`.
- **E4.4** Widget en multimodal + landing `/autobus/[origen]-[destino]`.

---

### FASE F — Meta-buscador Rome2Rio ES (semana 10, 29 junio – 5 julio)

**Entregable:** `/ir` — página estrella del site.

- **F1.** Input unificado con autocompletado (ciudad / aeropuerto / estación / puerto). Ya tenemos todos en Typesense.
- **F2.** Backend `/api/ir/route.ts`: en paralelo llama a OSRM (coche), OTP (tren+bus+multimodal) y compone con Skyscanner+Trainline+DirectFerries+FlixBus.
- **F3.** Tabla comparativa con las 4 columnas: tiempo · precio · CO₂ · comodidad. Ordenable por cualquiera.
- **F4.** Cada fila es expandible: muestra el itinerario leg a leg con mapa mini + botón afiliado.
- **F5.** Landing SEO: `/ir/[origen]/[destino]` SSG para top 2.000 pares españoles. Indexable, con texto único por par.
- **F6.** Sharing: deep-link `?from=X&to=Y&date=Z` funciona.
- **F7.** Tracking: cada click afiliado registra en `ApiUsage` con `source: "ir-page"`, `offer_type`, `provider`. Medición clara de revenue por par O-D.

**Verificación "smoke test 10 rutas":**
1. Madrid → Barcelona → ver AVE, vuelo, coche, bus
2. Valencia → Palma → ver vuelo, ferry+coche, ferry+bus
3. Sevilla → Las Palmas → sólo vuelo (no ferry directo)
4. Bilbao → San Sebastián → ver coche, Renfe MD, bus, Euskotren
5. Madrid → Toledo → ver Cercanías, coche, AVE-Avant
6. Barcelona → Andorra la Vella → ver coche, bus ALSA
7. A Coruña → Santiago → ver Cercanías, coche, bus
8. Ibiza → Formentera → sólo ferry
9. Granada → Málaga → ver tren MD, bus, coche
10. Murcia → Cartagena → ver coche, Cercanías, bus

---

## 3. Infraestructura nueva

| Componente | Dónde | RAM | Disco | Coste adicional |
|---|---|---|---|---|
| OSRM × 3 (car/bike/foot) | `compute` | ~18 GB (6×3) | ~100 GB × 3 | 0€ (ya tenemos el servidor) |
| Valhalla (isócronas + truck) | `compute` | ~6 GB | ~60 GB | 0€ |
| OpenTripPlanner 2 | `compute` | ~8 GB | ~20 GB | 0€ |
| Redis cache afiliados | existente `:6441` | +512 MB | — | 0€ |
| Skyscanner API | SaaS | — | — | gratis (afiliado) |
| Trainline API | SaaS | — | — | gratis (afiliado) |
| DirectFerries API | SaaS | — | — | gratis (afiliado) |
| FlixBus API | SaaS | — | — | gratis (afiliado) |

**Total RAM extra en compute:** ~32 GB. Servidor tiene 256 GB — sobra.

---

## 4. Modelos de datos nuevos

Añadir a `prisma/schema.prisma`:

```prisma
model AffiliateOffer {
  id           String   @id @default(cuid())
  provider     String   // "skyscanner" | "trainline" | "directferries" | "flixbus"
  offerType    String   // "flight" | "train" | "ferry" | "bus"
  originCode   String   // IATA | station slug | port code | bus stop id
  destCode     String
  departureAt  DateTime
  arrivalAt    DateTime
  priceCents   Int      // en céntimos de euro
  currency     String   @default("EUR")
  deeplinkUrl  String   @db.Text
  affiliateTag String
  fetchedAt    DateTime @default(now())
  expiresAt    DateTime // TTL 15-30 min según tipo

  @@index([originCode, destCode, departureAt])
  @@index([provider, expiresAt])
}

model AffiliateClick {
  id         String   @id @default(cuid())
  offerId    String?
  provider   String
  offerType  String
  route      String   // "madrid-barcelona"
  userIp     String?  // hasheado
  userAgent  String?
  clickedAt  DateTime @default(now())
  converted  Boolean  @default(false)
  revenueEur Decimal? @db.Decimal(8, 2) // rellena postback

  @@index([provider, clickedAt])
  @@index([route, clickedAt])
}

model RouteODPair {
  id             String @id @default(cuid())
  originSlug     String
  destSlug       String
  originType     String // "city" | "airport" | "station" | "port"
  destType       String
  popularity     Int    @default(0) // para priorizar SSG
  availableModes String[] // ["flight","train","ferry","car"]

  @@unique([originSlug, destSlug])
  @@index([popularity])
}
```

Un collector nuevo `TASK=affiliate-prefetch` puede pre-cachear ofertas de los top 500 pares una vez al día para que el primer usuario no espere.

---

## 5. SEO plan

Keywords objetivo con volumen real:

| Keyword pattern | Volumen mensual | Páginas generadas |
|---|---|---|
| "cómo ir de X a Y" | 5K-50K | 2.000 (SSG) |
| "billete tren X Y" | 2K-20K | 300 |
| "vuelo X Y barato" | 1K-15K | 200 |
| "ferry X Y" | 500-5K | 80 |
| "bus X Y" | 500-8K | 400 |
| "qué hay a 30 min en coche desde X" | 200-2K | 52 (capitales) |
| "combustible Madrid Barcelona" | 100-500 | 500 |

**Estimación tráfico:** 80-120K visitas orgánicas/mes en el pico (6-9 meses post-lanzamiento).

---

## 6. Monetización esperada

**Conservador (mes 6):**
- 40K visitas/mes × 2% CTR afiliado = 800 clicks
- 800 × 3% conversión = 24 conversiones
- Ticket medio afiliado 4€ × 24 = **96€/mes** 😞

**Realista (mes 12):**
- 100K visitas/mes × 5% CTR (landings específicas convierten mucho mejor) = 5.000 clicks
- 5.000 × 5% conversión (Trainline convierte bien) = 250 conversiones
- Ticket medio 6€ × 250 = **1.500€/mes**

**Optimista (mes 18-24):**
- 250K visitas/mes × 6% CTR = 15.000 clicks
- 15.000 × 6% conversión = 900 conversiones
- Ticket medio 8€ × 900 = **7.200€/mes** + cross-sell hoteles/coche = **~10K€/mes**

Esto sin contar API premium (`ApiKey` ya modelado) ni MCP server comercial.

---

## 7. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Skyscanner/Trainline rechazan afiliado (sitio nuevo, poco tráfico) | Media | Alta | Aplicar YA, no esperar. Usar Awin / Rakuten como puente si deniegan directo |
| Rate limits de APIs afiliados matan el coste | Media | Media | Cache Redis 15-30 min, pre-fetch batch nocturno top 500 pares |
| OTP tarda en construir grafo (~30 min) | Baja | Baja | Build en worker separado, hot-swap cuando termina |
| GTFS estáticos se desactualizan y OTP rutea a servicios cancelados | Alta | Media | Re-build semanal + fallback GTFS-RT para cancelaciones en vivo |
| DGT o Renfe cambian su API (como ya pasó con LD) | Media | Alta | Abstract layer en `src/lib/routing/` permite swap |
| Google lanza Rome2Rio-like en España | Media | Alta | Nuestro diferencial es la **integración profunda con datos estructurales** (tráfico, AIS, AEMET) que ellos no tienen |

---

## 8. Criterio Go/No-Go por fase

| Fase | Go si… | No-Go si… |
|---|---|---|
| A | 3 perfiles OSRM responden < 200 ms | Algún perfil falla en build |
| B | /calculadora Madrid-Bilbao coincide ±5% con cálculo manual | Peajes mal calculados |
| C | OTP responde Sants→Girona en < 2s con 3+ itinerarios | OTP no arranca en 30 min |
| D | Isócrona 30 min Madrid coincide con referencia | Valhalla inestable como antes |
| E (cada sub-fase) | Afiliado aprobado + primer click trackeado | Afiliado deniega y no hay alternativa |
| F | 10 smoke tests pasan | Cualquier test falla sin workaround |

---

## 9. Calendario resumen

| Sem | Fechas | Fase | Entregable |
|---|---|---|---|
| 1 | 27 abr – 3 may | A | OSRM 3 perfiles en /mapa |
| 2 | 4 – 10 may | B | /calculadora con motor real + peajes + CNMC |
| 3-4 | 11 – 24 may | C | OTP2 multimodal funcionando |
| 5 | 25 – 31 may | D | Isócronas + perfil camión |
| 6 | 1 – 7 jun | E-1 | Skyscanner integrado, vuelos en /ir |
| 7 | 8 – 14 jun | E-2 | Trainline integrado |
| 8 | 15 – 21 jun | E-3 | DirectFerries integrado |
| 9 | 22 – 28 jun | E-4 | FlixBus integrado |
| 10 | 29 jun – 5 jul | F | /ir meta-buscador live |
| **6 jul** | — | 🚀 | **Lanzamiento /ir al público** |

---

## 10. Próximos pasos inmediatos

1. **Aplicar YA a programas afiliados** (tardan 1-3 semanas en aprobar):
   - Skyscanner Partners
   - Trainline Partners (el más crítico — Renfe/OUIGO/Iryo)
   - DirectFerries
   - FlixBus
2. **Reservar `/ir` como namespace** en `src/app/` para evitar colisiones.
3. **Decidir:** ¿esperamos al lunes 20 (post-launch) para arrancar fase A, o metemos fase A durante la semana del launch si el scope del launch ya está cerrado?

---

**Documento vivo.** Actualizar al final de cada fase con lecciones y desviaciones reales.
