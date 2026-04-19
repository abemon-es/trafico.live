# Mapa interactivo → Overlay → Landing de entidad

**Fecha:** 2026-04-19
**Owner:** MJ
**Contexto:** Feature no planificada en `ROADMAP-LAUNCH-2026-04-20-v2` ni `ROADMAP-MASTER-2026`. Detectada al verificar que el mapa `/mapa` no responde a clicks sobre entidades (confirmado en `TraficoMap.tsx:236-240`, TODO fase 2 explícito).

---

## 1. Diagnóstico

### Estado actual del mapa
- `<TraficoMap>` renderiza capas desde `LAYER_REGISTRY` con flag `interactive: true`, pero **no hay `map.on("click")` en ningún sitio del código** (0 hits en `src/components/map/**` y `src/lib/map-layers/**`).
- El hook `useMapInteraction` no existe. `FeatureOverlay` no existe. `entity` prop de `<TraficoMap>` es un stub con `TODO(phase 2)`.
- Consecuencia: el usuario ve puntos/líneas pintados, hace click y no pasa nada. Bounce garantizado.

### Estado de las landings destino (crítico)
La auditoría SEO sugería crear ~27k landings nuevas en S3. **La mayoría ya existen como rutas dinámicas**:

| Entidad del mapa | Ruta dinámica | Estado |
|---|---|---|
| Carretera | `/carreteras/[roadId]` | ✅ |
| Provincia | `/provincias/[code]` | ✅ |
| Comunidad Autónoma | `/comunidad-autonoma/[community]` | ✅ |
| Municipio | `/municipio/[slug]` | ✅ |
| Aeropuerto | `/aviacion/aeropuertos/[iata]` | ✅ |
| Puerto | `/maritimo/puertos/[slug]` | ✅ |
| Ferry (línea) | `/maritimo/ferries/[slug]` | ✅ |
| Estación tren | `/trenes/estacion/[slug]` | ✅ |
| Línea tren | `/trenes/linea/[slug]` | ✅ |
| Gasolinera | `/gasolineras/[id]` | ✅ |
| Estación meteo | `/meteo/estaciones/[slug]` | ✅ |
| Estación ICA | `/calidad-aire/estacion/[id]` | ✅ |
| Cámara DGT | ⚠️ sólo listado `/camaras` | Gap S3 |
| Radar | ⚠️ sólo listado `/radares` | Gap S3 |
| Panel variable | ⚠️ sólo listado `/paneles` | Gap S3 |
| Estación aforo | ⚠️ sólo listado `/estaciones-aforo` | Gap S3 |
| Buque AIS | ❌ no existe | Gap tipo "no landing" |
| Aeronave ADS-B | ❌ no existe | Gap tipo "no landing" |

**Conclusión:** 12/17 entidades clickables tienen landing propia. El cuello de botella real **no es contenido — es el cableado del click**.

---

## 2. Gap analysis (SEO)

Keywords con **landing existente + tráfico potencial alto + click-path roto hoy**:

| Keyword (vol.) | Landing | Bloqueador de descubrimiento |
|---|---|---|
| "ferry a Mallorca/Ibiza/Ceuta" (10K–100K/mes c/u) | `/maritimo/ferries/[slug]` | Usuario en `/maritimo` ve rutas en el mapa, no puede clickarlas |
| "aeropuerto Madrid Barajas salidas hoy" (10K–100K) | `/aviacion/aeropuertos/[iata]` | Mapa de `/aviacion` muestra 42 aeropuertos sin click |
| "tráfico AP-7 / A-6 / A-4" (M c/u) | `/carreteras/[roadId]` | Segmentos IMD pintados sin click |
| "retrasos Renfe hoy" (L, priority score 80) | `/trenes/estacion/[slug]` | 2.154 estaciones pintadas sin click |
| "gasolinera más barata cerca" (XL) | `/gasolineras/[id]` | Pines de gasolineras sin click → CTR perdido |
| "calidad del aire Madrid" (L) | `/calidad-aire/estacion/[id]` | 565 estaciones ICA pintadas sin click |
| "tráfico [provincia]" / "incidencias [provincia]" (L agregado) | `/provincias/[code]` | No hay capa clickable de provincia |

**Valor oculto:** la auditoría VERDICT §P1 S4 pide "RelatedLinks activación cross-vertical" como palanca de interlinking. El overlay del mapa es la implementación natural de ese interlinking — cada click cruza verticales (ej. click en Madrid → card con gasolineras + ICA + trenes + meteo + incidencias de Madrid, todo enlazado).

### Keywords **sin landing** con volumen suficiente para crear

| Keyword | Vol. | Propuesta |
|---|---|---|
| "radar aviones España tiempo real" | 10K–100K | Entidad aeronave → modal "qué aeronave es", link a `/aviacion` (OK actual) |
| "seguimiento buques tiempo real" | 10K–100K | Entidad buque → modal con MMSI, tipo, ruta, link a `/maritimo/buques/[mmsi]` (nueva) |
| "cámaras DGT A-6 km X" | low vol pero cola larga × 1.200+ cámaras | `/camaras/[id]` + imagen embed |
| "radar [carretera] km X" | cola larga | `/radares/[id]` |

---

## 3. Roadmap priorizado

Ordenado por **ROI = (tráfico potencial desbloqueado × landings-ya-existen) / esfuerzo**.

### Fase 1 — Cableado base del overlay (ROI máximo, ~3 días)

**S1.1 — Hook `useMapInteraction` + overlay genérico**
- `src/lib/map-layers/hooks/useMapInteraction.ts`: `map.on("click", layers, …)`, `queryRenderedFeatures`, cursor pointer en hover, `onSelect(feature, layerId, lngLat)`.
- `src/components/map/FeatureOverlay.tsx`: drawer lateral 380px, cerrable, responsive.
- Integración en `TraficoMap.tsx` detrás de prop opcional `interactivity: boolean`.

**S1.2 — Adapters por entidad (12 en total, 1 por tipo)**
- Cada adapter convierte la feature cruda (props del tile) en `{ title, subtitle, kpis[], href }`.
- Priorización interna:
  1. **ferry-routes** (desbloquea 30K–300K búsquedas/mes) — el mapa marítimo hoy pinta rutas inútiles.
  2. **airports** (priority A auditoría).
  3. **gas-stations** (XL volumen + landing ya existente).
  4. **railway-stations** (score 80 auditoría).
  5. **railway-routes** (cola larga cercanías).
  6. **incidents / roadworks** (ya son temporales — deeplink a `/incidencias/[id]`).
  7. **road-segments / stations** (IMD → `/carreteras/[roadId]`).
  8. **climate-stations**.
  9. **air-quality**.
  10. **chargers**.
  11. **cameras** (degradado hasta tener landing — por ahora link al listado filtrado).
  12. **radars / panels** (idem).

**Criterio de "hecho":** click en cualquier entidad con landing → overlay con 3-5 KPIs + botón "Ver más" que navega. Sin overlay vacío ni botón muerto.

---

### Fase 2 — Capas administrativas clickables (~2 días)

Hoy `province-choropleth` tiene `interactive: false` y no hay capa de CCAA ni municipio.

**S2.1 — Provincia clickable**
- Añadir `province-hit` (fill transparente) sobre `spain-provinces.geojson`, `interactive: true`, `maxZoom: 9`.
- Overlay: nombre + KPIs agregados (incidencias activas, gasolinera media, IMD medio, alerta meteo) → botón a `/provincias/[code]`.

**S2.2 — CCAA clickable**
- Generar `/public/geo/spain-ccaa.geojson` (agregado desde provincias).
- Capa `ccaa-hit`, activa en `zoom < 7`, por encima de provincias.
- Overlay → `/comunidad-autonoma/[community]`.

**S2.3 — Municipio clickable** (zoom ≥ 10)
- Reusar tile Protomaps `places` o generar PMTiles de centros urbanos INE (8.131 municipios).
- Overlay → `/municipio/[slug]` (landing ya existe).
- **Decisión pendiente:** generar PMTiles de municipios cuesta ~1 día. Si no, usar POI de Protomaps como fallback sin overlay.

---

### Fase 3 — Landings faltantes (S3 auditoría reconducido, ~1 semana)

Sólo para los 5 gaps reales:

| Entidad | Ruta propuesta | Nº URLs | Fuente de datos | Schema.org |
|---|---|---|---|---|
| Cámara DGT | `/camaras/[id]` | ~1.200 | tabla `Camera` | `VideoObject` + `Place` |
| Radar | `/radares/[id]` | ~1.800 | tabla `Radar` | `Place` + `Thing` |
| Panel variable | `/paneles/[id]` | ~700 | tabla `VariablePanel` | `Place` + mensaje actual |
| Estación aforo | `/estaciones-aforo/[id]` | ~14.400 | tabla `TrafficStation` | `Place` + IMD histórico |
| Buque AIS | `/maritimo/buques/[mmsi]` | variable | tabla `Vessel` | `Ship` (schema extendido) |

**Nota importante:** antes de generar 14.400 URLs de estaciones de aforo hay que resolver los 2 bloqueadores P0 de la auditoría VERDICT:
1. Canonicals auto-reportando `/` (afecta a todas las nuevas páginas).
2. Sitemap que omita las 14.400.

Si no, se crea duplicate-content masivo.

---

### Fase 4 — Hardening SEO del overlay (~2 días)

Cada overlay debe actualizar la URL con hash (`#ferry-baleares-palma`) sin navegar, para que:
1. Compartir link abra el mapa con overlay pre-abierto.
2. Analytics (GA4 `page_view` virtual) atribuya engagement.
3. Breadcrumb del overlay alimente `BreadcrumbList` inline.

Tracking evento `map_entity_click` con `{ layerId, entityType, hasLanding }` para medir CTR overlay → landing en GA4. Objetivo: CTR > 25%.

---

## 4. Decisiones requeridas

| # | Decisión | Default propuesto |
|---|---|---|
| 1 | Drawer lateral vs. popup MapLibre | **Drawer** (escala a contenido rico + móvil) |
| 2 | Click en provincia: preview + CTA o deeplink directo | **Preview + CTA** (mantiene contexto de mapa) |
| 3 | Municipios clickables en launch o S3 | **S3** (PMTiles custom, no crítico para launch) |
| 4 | Capa CCAA: generar geojson agregado o importar | **Agregado desde provincias** (deterministic) |
| 5 | Buques sin landing: overlay-only o generar landing | **Overlay-only en Fase 1, landing en Fase 3** |

---

## 5. Impacto estimado

- **Fase 1 + 2 (1 semana)**: desbloquea ~500K búsquedas/mes potenciales (suma de ferries, aeropuertos, gasolineras, trenes, provincias). El tráfico real depende de CTR post-overlay y de resolver los P0 de sitemap/canonical.
- **Fase 3 (+1 semana)**: cola larga de 18.000 URLs nuevas (cámaras, radares, paneles, aforos, buques). Prioridad baja sin P0 resueltos.
- **Fase 4 (+2 días)**: duplica el valor social/compartido y permite medir.

**Recomendación:** ejecutar Fase 1 ya (el mapa está roto funcionalmente — usuario no puede usarlo), Fase 2 justo después, Fase 3 sólo cuando los P0 de la auditoría estén cerrados.

---

## 6. Archivos críticos

| Archivo | Por qué importa |
|---|---|
| `src/components/map/TraficoMap.tsx` | Punto de entrada — `TODO(phase 2)` en L236-240 |
| `src/lib/map-layers/registry.ts` | Single source of truth de `interactive`; hay que añadir adapters |
| `src/lib/map-layers/hooks/` | Donde vive `useMapInteraction` nuevo |
| `public/geo/spain-provinces.geojson` | Base para capas administrativas clickables |
| `docs/seo-audit-2026-04-17/VERDICT.md` | P0 de canonical + sitemap son prerrequisito para Fase 3 |
