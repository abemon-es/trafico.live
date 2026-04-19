# Emergent Verticals — lo que cubrimos "gratis" con el stack actual
**Fecha:** 2026-04-19
**Contexto:** Tras definir el plan intent-driven (6 intents × 4 modos × N entidades), identificar los verticales que **emergen automáticamente** cuando se cruzan datos que ya capturamos — sin colectores nuevos, solo nuevas plantillas sobre las mismas pipes.

---

## La tesis profunda

**trafico.live NO es "otro agregador de movilidad".** Es el **answer engine de datos dinámicos de España+Portugal**. La movilidad es el punto de entrada SEO, no el techo.

### Arquitectura de 5 capas sobre la misma data

| Capa | Pregunta usuario | Ejemplo | Data necesaria | ¿Existe hoy? |
|---|---|---|---|---|
| 0. Entidad | ¿Qué es esto? | "Estación Atocha" | Prisma model + GTFS | ✅ |
| 1. Estado | ¿Qué pasa ahora? | "Retraso 8 min AVE Madrid-Valencia" | Collector real-time | ✅ |
| 2. Predicción | ¿Qué va a pasar? | "Habrá atasco a las 18 en M-30" | ML sobre histórico propio | ⚠️ stack listo, modelo no |
| 3. Impacto | ¿Cómo me afecta? | "Tu vuelo BCN-MAD a las 16 tiene 40% riesgo cancelación por viento" | Cross-collector | ⚠️ data lista, cross no construido |
| 4. Decisión | ¿Qué hago? | "Sale ahora o pierde vuelo. Ruta alternativa: M-40" | Capa 1-3 aplicada | ❌ no existe |

**El plan actual vive en capas 0-1.** Las capas 2-4 son donde vive el moat contra AI Overview, contra competidores, y contra Perplexity/ChatGPT: porque requieren cálculo sobre datos propios en tiempo real, no regurgitar contenido.

---

## Los 10 verticales que emergen automáticamente

### 1. True multimodal route planner (Rome2Rio killer)

**Intent:** "madrid barcelona como ir" / "sevilla a madrid cuanto cuesta" / "ruta mas rapida"
**Volumen (query.py validable):** ~300-600K/mes solo ES cola larga
**Data necesaria (ya tenemos):** Road network + Renfe GTFS + AENA airports + Ferry routes + FlixBus GTFS + Fuel prices + Tolls + EV chargers + Travel time sensors
**Gap competitor:** Rome2Rio (EN, freemium), Google Maps (no compara coste total)
**Producto:** `/ruta/[origen]-[destino]` con coche/AVE/avión/bus/ferry comparados por tiempo + coste real (peajes + gasolina si coche, euros si AVE/vuelo)
**Moat:** **solo nosotros tenemos los 5 modos + precios live + afiliados deeplink en cada opción**
**Monetización:** Skyscanner/Trainline/Omio/DirectFerries afiliados por opción clickeada

### 2. Predictive forecasting (ML sobre datos propios)

**Intent:** "¿habrá atasco a las 18?" / "¿el AVE Madrid-Valencia va con retraso hoy?" / "¿subirá la gasolina mañana?"
**Volumen:** ~2M/mes en cola (es específico por entidad)
**Data necesaria (ya tenemos):**
- Madrid 6K sensores /5min × 3 años de histórico = feature vector brutal
- CNMC 10 años × 12K estaciones
- `RailwayDelaySnapshot` 2-min resolution
- AEMET histórico 7 años
- DGT accident microdata 2019-2023 (500K records)
**Gap competitor:** **NADIE** hace esto en ES. Waze hace predicción de tiempo pero no de precios/retrasos/accidentes por tramo
**Producto:** cada página de entidad tiene "Previsión 24-72h" con nivel de confianza y explicación ("según histórico + clima + día semana")
**Moat estructural:** 10 años de data propia **no replicable** en menos de 10 años aunque Google te copie la idea mañana
**Monetización:** API premium tier — fleet managers pagarán €1K-5K/mes por este endpoint

### 3. Weather-impact on mobility (cross-vertical único)

**Intent:** "¿cancelan vuelos por viento Málaga hoy?" / "¿ferry Algeciras sale con temporal?" / "¿lluvia afecta ruta Madrid-Sevilla?"
**Volumen:** ~400-800K/mes (AEMET alertas + queries cross)
**Data necesaria:** AEMET alertas + forecasts × todos los modos × cruce ruta/puerto/aeropuerto
**Gap competitor:** aemet.es publica alertas sin vincular a sectores afectados. eltiempo.es idem. **12/12 competidores NO cruzan**
**Producto:** `/alerta-meteo/[slug]` enriquecido con "vuelos afectados", "ferries que pueden cancelar", "tramos carretera con riesgo"
**Moat:** cross-vertical + real-time — es cálculo, no contenido (AI-Overview-proof)
**Monetización:** CTR a seguros viaje (CPC €3-8) + reserva hotel alternativo

### 4. Health & environment decision support

**Intent:** "¿puedo correr hoy Madrid?" / "¿es seguro llevar niño parque?" / "¿aire limpio hoy provincia?"
**Volumen:** ~500K-1M/mes (cruce "calidad aire" + "correr/deporte/niño/asma")
**Data necesaria:** ICA MITECO + AEMET + polen (data opcional) + ozono + recomendaciones por colectivo
**Gap competitor:** iqair sirve número ICA pero NO recomendación accionable por perfil (deportista, asmático, embarazada, niño)
**Producto:** `/calidad-aire/[ciudad]/deporte` + `/correr-madrid-hoy` + `/salida-niños-[ciudad]`. Widget "¿Puedo hacer X?" con semáforo verde/amarillo/rojo basado en ICA + temp + humedad + viento
**Moat:** respuesta accionable personalizada, no dato crudo
**Monetización:** seguros salud (CPC alto), apps deportivas, marcas running

### 5. Events + mobility (combinador cultural)

**Intent:** "¿como llegar al Bernabéu?" / "¿hay atascos por partido Atlético?" / "¿salir antes a Barajas por huelga?"
**Volumen:** depende de eventos — picos masivos (partidos, conciertos, puentes)
**Data necesaria:** Event calendar (LaLiga, eventos Madrid/Barcelona, AENA strikes, operaciones DGT) × traffic prediction × transit alerts
**Gap competitor:** NADIE cruza eventos culturales con movilidad predictiva en ES. Google Maps dice "tardarás X" sin contexto del evento
**Producto:**
- `/evento/[slug]` (partido-fútbol, concierto, feria, procesión) con "cómo llegar + cuándo salir + aparcamiento + volver a casa"
- Integración con operaciones especiales DGT (Semana Santa, puentes, verano)
- Calendario cultural auto-scraped + predicción mobility
**Moat:** integración cross-source que requiere infra de scraping propio
**Monetización:** Parclick aparcamiento evento + hotel near venue + alquiler coche

### 6. Data journalism / storytelling (10 años de histórico)

**Intent:** "¿gasolinera más barata histórica?" / "¿cuál es el tramo con más accidentes España?" / "¿fue 2025 récord de calor?"
**Volumen:** ~200-500K/mes cola larga + social sharing viral
**Data necesaria:** todo el histórico que ya tenemos (CNMC 10y, AEMET 7y, accidentes 5y, IMD, aforos)
**Gap competitor:** medios publican estudios puntuales. Nadie tiene un portal de data journalism permanente con actualizaciones automáticas
**Producto:** `/data/` hub con artículos auto-generados (top 10, rankings, récords, curiosidades) — pipeline LLM + datos duros
**Moat:** contenido original + citable por prensa (backlinks gratuitos, autoridad SEO)
**Monetización:** indirecta — autoridad, backlinks, engagement

### 7. Compliance automation (normativa dinámica)

**Intent:** "¿mi coche puede entrar ZBE Madrid?" / "¿necesito baliza V-16?" / "¿cuántos puntos me quedan?" / "¿multa consultar?"
**Volumen:** ~1M/mes (baliza V-16 246K + etiqueta ambiental 150K + ZBE 100K + multa consultar 110K + carnet puntos)
**Data necesaria:** ZBE polygons + etiqueta ambiental rules + DGT multas endpoint + V-16 compliance calendar
**Gap competitor:** dgt.es es gubernamental bloatware, nadie resuelve el intent real "¿puedo/necesito/debo?"
**Producto:**
- `/zbe/[ciudad]/puedo-entrar` con input matrícula → resultado binario + explicación
- `/baliza-v-16/compatible` con tu modelo coche
- `/multa-consulta` deeplink DGT + guía reclamación
- `/carnet-puntos/renovar` guía + calculadora
**Moat:** interpretación de normativa + data oficial en formato accionable
**Monetización:** CPC €4-12 (legaltech), marketplace baliza V-16 (afiliado Amazon), abogados tráfico

### 8. Emergency / crisis real-time (España-específico)

**Intent:** "DANA España" (tendencia 2024-2026) / "ola calor 2026" / "temporal Canarias" / "terremoto"
**Volumen:** event-driven, picos de 500K-5M en episodios
**Data necesaria:** AEMET alertas + Copernicus + earthquakes IGN + SASEMAR + avisos Protección Civil
**Gap competitor:** aemet.es publica alertas. rtve.es publica noticia. Nadie hace live dashboard con mapa + zonas afectadas + servicios transporte parados + recomendaciones
**Producto:** `/alerta-activa/[tipo]/[region]` live durante la crisis. Equivalente a live traffic dashboards de Weather Channel, pero enfocado España
**Moat:** infra real-time + velocidad de publicación (auto-generated cuando AEMET emite rojo)
**Monetización:** indirecta — Discover/News traffic masivo, autoridad brutal durante eventos

### 9. Tourism intelligence (uniquely Spain/Portugal)

**Intent:** "mejor momento visitar Sevilla" / "Barcelona sin turistas" / "Puente mayo sin atascos"
**Volumen:** ~300-500K/mes (cola estacional)
**Data necesaria:** IMD turística + aforos + weather + hotel rates (externo)
**Gap competitor:** Lonely Planet/TripAdvisor opinan, nadie lo calcula con data
**Producto:** `/turismo/[ciudad]/cuando-ir` con calendario de visitantes (alta/media/baja) + clima + eventos culturales + recomendación día de la semana
**Moat:** data propia turística
**Monetización:** Booking afiliado hotel + actividades GetYourGuide

### 10. API-as-content (pSEO para developers)

**Intent:** "API DGT tráfico" / "API AEMET gratis" / "scraping Renfe" / "integrar gasolineras"
**Volumen:** ~50-100K/mes pero **audiencia B2B de alto valor**
**Data necesaria:** ya lo tienes — tu propia API documentada
**Gap competitor:** ninguno hace esto sistemáticamente en ES
**Producto:** `/api/[endpoint]` × 121 endpoints con ejemplo live + casos de uso + Stripe checkout + schema
**Moat:** tu API + documentación + autoridad
**Monetización:** **DIRECTA** — API premium tier. 1 cliente enterprise = 3 meses de afiliados realistas

---

## Verticales únicamente españoles/portugueses (cultural moat)

No replicables por competidor internacional:

| Vertical | Por qué único ES/PT | Data |
|---|---|---|
| Operación especial DGT (Semana Santa, agosto, puentes) | Calendario cultural + DGT announcements | ✅ tenemos |
| DANAs mediterráneas | Fenómeno meteo español, léxico propio | ✅ AEMET |
| Romerías / procesiones (Semana Santa, ferias) | Eventos masivos localizados | Scraping local |
| Vendimia / temporada fruta (mobility agrícola) | Movimientos carga/trabajadores | IMD + calendar |
| Temporal Canarias / calima | Fenómeno regional con impacto vuelos | AEMET + AENA |
| Puente 1 mayo, 15 agosto, 12 octubre, Constitución | Calendario único español | Fixed dates |
| Festivos autonómicos (11S Cataluña, 25A Portugal) | PT festivals + CCAA calendar | Calendar |

---

## Cómo se encaja esto sin reventar el plan

**Regla de oro:** los 10 verticales emergentes son **plantillas** sobre las pipes existentes. No cambian Sprint 0-9 (el plan base sigue intacto).

| Vertical emergente | Sprint óptimo | Esfuerzo extra | Desbloquea |
|---|---|---|---|
| 1. Multimodal planner | Sprint 6 (después ciudad-hubs) | 2 semanas (combinar APIs que ya usamos) | Afiliado Skyscanner + Trainline + Omio |
| 2. Predictive forecasting | Sprint 9-10 | ML model (Claude/GPT + data propia) | API tier premium |
| 3. Weather impact | Sprint 8 | 1 semana (query cross-vertical) | CTR seguros viaje |
| 4. Health decision | Sprint 10 | 1 semana (ICA + rules engine) | Afiliado salud |
| 5. Events + mobility | Sprint 11 | 2 semanas (event scraper + cruce) | Parclick + Booking eventos |
| 6. Data journalism | Sprint 9 (paralelo editorial) | 0 extra (pipeline editorial ya planificado) | Backlinks + autoridad |
| 7. Compliance automation | Sprint 11 (con legal pillars) | 1-2 semanas (rules engine) | €4-12 CPC legaltech |
| 8. Emergency crisis | Sprint 12 | Infra event-driven (AEMET webhooks) | Discover/News traffic |
| 9. Tourism intelligence | Sprint 13+ | Depende stack tourism | Booking premium |
| 10. API-as-content | Sprint 5 (paralelo API docs) | 1 semana templates | API revenue directa |

**Total esfuerzo extra vs plan base:** ~10-12 semanas-persona adicionales — se distribuyen entre sprints 5-13 sin bloquear los core.

---

## La gran reformulación del pitch

**Antes:** "Plataforma multimodal de información de tráfico"
**Ahora:** "El motor de respuestas de datos dinámicos de España y Portugal"

Esto cambia:

- **Audience TAM**: no solo viajeros → viajeros + deportistas + conductores + padres + pacientes + fleet managers + desarrolladores + medios + aseguradoras
- **Revenue stack**: no solo afiliados viaje → afiliados viaje + afiliados salud + afiliados legal + API B2B + data licensing + media partnerships
- **Moat narrative**: no "más datos" → "respuestas que requieren cálculo cross-vertical sobre datos propios históricos" (AI-proof)
- **Investor/partner story**: no "competir contra eltiempo" → "Cloudflare-para-data-pública-española"

---

## Qué hay que validar antes de vender esta historia

Ejecutar con `query.py` para confirmar volumen de intents emergentes:

```bash
# 1. Multimodal planner
python3 query.py search --country es --pattern "como ir desde|como ir de|como llegar.*en|opciones.*viaje.*a|ruta.*hasta" --min-vol 500 --top 30

# 2. Predictive
python3 query.py search --country es --pattern "habra atasco|habra retraso|precio.*mañana|previsión.*tráfico" --min-vol 200 --top 20

# 3. Weather impact
python3 query.py search --country es --pattern "vuelo.*cancelad|ferry.*oleaje|tren.*tormenta|cancelacion.*viento" --min-vol 500 --top 20

# 4. Health / sport
python3 query.py search --country es --pattern "correr.*hoy|deporte.*aire|aire limpio|pasear.*niño|asma.*aire" --min-vol 500 --top 20

# 5. Events mobility
python3 query.py search --country es --pattern "como llegar.*bernabeu|como llegar.*camp nou|aparcamiento.*estadio|huelga.*aena" --min-vol 500 --top 20

# 7. Compliance
python3 query.py search --country es --pattern "puedo entrar zbe|mi coche etiqueta|renovar carnet|multa consultar dgt" --min-vol 1000 --top 20

# 9. Tourism intelligence
python3 query.py search --country es --pattern "mejor epoca|sin turistas|menos gente|cuando visitar|puente.*sin" --min-vol 500 --top 20
```

Hacerlo en Sprint 1 y congelar qué verticales emergentes tienen demostrada demanda antes de asignar sprints.

---

## Decisión siguiente

Arrancar el plan base intact (Sprints 0-4: P0 + trenes + ciudad-hubs descompuestos). Pero **con diseño de plantilla ya pensado para las capas 2-4** — es decir, las URLs de la capa 1 ("/trenes/estacion/atocha/llegadas") deben tener **slots** para capa 2 ("previsión") y capa 3 ("impacto meteo") que se iluminan cuando la data está lista.

Esto evita tener que reescribir páginas en Sprint 8 cuando lleguen los modelos predictivos — se añade el widget y listo.
