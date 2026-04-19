# Expert SEO: Carreteras + Tráfico Rodado — trafico.live
> Fecha: 2026-04-19 | Fuentes: `03-keyword-universe-full.csv` (70K filas), SERPs wave4/wave7, KD wave9

---

## 1. Intent Cartography Carretera (13 clusters)

### C1 — Estado ciudad ahora ("tráfico Madrid hoy")
**Intent real:** "¿Hay atasco en mi ciudad ahora mismo? ¿Puedo salir ya?"
**Volumen combinado:** ~30K/mes (Madrid 5.4K + Bilbao 1.9K + Sevilla 4.4K + Barcelona 2.9K + Valencia 2.9K + Zaragoza 1.3K + resto ~12K)
**KD:** 10-51 (wave9). **Competición:** LOW
**SERP observada (`atascos Madrid`, wave7):** madrid.es #1, dgt.es #2, viamichelin.es #3. AI Overview presente (asynchronous). 20minutos como top_story.
**Insight:** El intent es visual/dinámico. Nadie lee texto. El ganador entrega mapa + contador de retenciones activas. madrid.es es lento y feo. viamichelin.es gana con mapa pero no tiene datos propios.

### C2 — Accidente en ruta ("accidente A-6 hoy")
**Intent real:** "¿Hay accidente en mi carretera usual? ¿Paso o rodeo?"
**Volumen combinado:** >25K/mes (accidente A-6 hoy 2.4K + accidente A-5 hoy 2.9K + accidente A-2 hoy 2.4K + accidente A-8 hoy 2.4K + accidente Madrid hoy 5.4K + accidente Barcelona hoy 2.4K + accidentes AP-7 5.4K + más variantes)
**KD:** 0-22. El KD 0 en "accidente A-6 hoy" y "accidente A-8 hoy" es la señal más fuerte de todo el universo.
**SERP:** No tenemos SERP específica capturada, pero por analogía con `atascos Madrid` (wave7): top resultado = noticia periodística (lasprovincias, abc) que pierde relevancia en horas. El gap es enorme.
**Insight crítico:** Demanda de 49.5K/mes para "accidente tren hoy" (aunque fuera scope, patrón idéntico para carretera). La web que sirva feed DGT en tiempo real + mapa de incidentes + histórico de accidentalidad por punto domina este cluster con KD mínimo.

### C3 — Ruta específica en tiempo real ("M-30 tráfico", "AP-7 atascos viernes")
**Intent real:** "¿Cómo está mi ruta habitual AHORA o en las próximas horas?"
**Volumen:** M-30 madrid mapa 390, tráfico madrid M30 110, tráfico A-6 (datos KD), AP-7 autopista 260 + decenas de variantes por tramo
**KD:** 0 en casi todas las variantes de vía específica.
**Insight:** Long-tail altísimo valor. "AP-7 cortada última hora" 720/mes KD=0. "Dónde está cortada la AP-7" 50/mes. Son búsquedas de emergencia → alta conversión en engagement.

### C4 — Cámaras DGT punto-específicas
**Intent real:** "Ver la cámara de tráfico de [punto concreto]" — el usuario quiere VER, no leer.
**Volumen combinado:** cámaras DGT 1.3K + cámara tráfico DGT 1.6K + cámaras tráfico madrid 590 + navacerrada 14.8K + Huesca 1.6K + A-2/A-5/A-6 (cámaras específicas) + Altube + vitoria + etc.
**KD:** 0-31 (cámaras DGT KD=31, navacerrada KD=4-20, resto ~0)
**SERP (`cámaras dgt`, wave4):** dgt.es #1 (mapa con iframe), race.es #2 con mapa interactivo. dgt.es domina brand pero su UX es de 2008.
**Insight:** Cada punto de cámara (1.300+ en la BD) merece landing SSG con imagen embebida + contexto de carretera. `cámaras navacerrada` tiene 14.8K/mes KD=0 con SERP de fotos de nieve. Oportunidad perfecta.

### C5 — Radares por tramo/carretera
**Intent real:** "¿Dónde están los radares en [carretera]? ¿Hay radar de tramo en [A-X]?"
**Volumen:** radares DGT 49.5K (KD=57, brand competitivo) + radar velocidad 390 + radares de tráfico 26 KD + radar de tráfico 10 KD + M-40 radar fijo 50/mes KD=0
**KD:** Bajísimo en variantes de carretera específica. El KD=57 de "radares DGT" es de brand, no competible.
**SERP (`radares dgt`, wave4):** dgt.es #1 (PDF descargable — UX pésima), race.es #2, Play Store #3. Google Play no es competencia real.
**Insight:** dgt.es sirve un PDF de 189KB. La landing `/radares/[carretera]/[tramo]` con mapa interactivo + tipo de radar + velocidad límite le gana en cada búsqueda geo-específica.

### C6 — Baliza V-16 DGT 3.0 (cluster legal emergente)
**Intent real:** "¿Es obligatoria? ¿Cuál comprar? ¿Cómo validarla?" + compra directa
**Volumen combinado:** baliza coche 5.4K + dgt baliza v16 homologadas 4.4K + baliza v16 precio 2.9K + balizas v16 precio 2.9K + dgt comprobar baliza 1.6K + nueva baliza dgt 720 + validar/registrar baliza dgt 520 + baliza v16 tiempo real 260 + baliza v16 ultima hora 110 = **~18K+ combinado**
**KD:** 0-11. Competition HIGH (señal de intención comercial → afiliado).
**Insight:** La DGT tiene la página oficial de registro pero no explica el "¿cuál comprar?" ni el flow de homologación real. Trafico.live tiene `DgtBeaconV16` table. Landing `/baliza-v16` con lista homologadas + comparador precio + validador de registro = capture completo del cluster.

### C7 — ZBE por ciudad (multar / acceso / precio)
**Intent real:** "¿Puedo entrar con mi coche? ¿Qué etiqueta necesito? ¿Me van a multar?"
**Volumen combinado:** zona de bajas emisiones 165K + zona bajas emisiones madrid 9.9K + zbe 9.9K + zona bajas emisiones (general) 2.9K + 109 keywords ciudad-específicas sumando ~50K más = **>230K total cluster**
**KD:** 5-53. La keyword madre "zona de bajas emisiones" tiene KD vacío en el CSV (dato sin enriquecer); `zbe` tiene KD=43.
**SERP wave7 / observación:** No tenemos SERP directa de ZBE capturada, pero el patrón observado en ciudades: ayuntamiento local #1, blogs desactualizados, consultas de multas en Google PAA.
**Insight:** Este es el cluster con mayor volumen total del vertical carreteras. 165K/mes para "zona de bajas emisiones" con KD desconocido pero probable <50 (término relativamente nuevo). Tenemos tabla `Zbe` en Prisma. Landing por ciudad + mapa interactivo + checker de matrícula = dominación completa. Las páginas municipales son estáticas (PDF/tablas sin dinámica).

### C8 — Peajes por autopista (precio + alternativa sin peaje)
**Intent real:** "¿Cuánto me cuesta? ¿Hay ruta alternativa gratis?"
**Volumen:** peajes 9.9K + peajes AP-7 480 + peajes AP-68 880 + precio peaje AP-6 590 + precio peaje AP-36 260 + precio peajes AP-7 210 + AP-68 precio 210 + AP-8/AP-15/AP-66 etc. + "sin peaje Madrid Valencia" (wave10 ideas) + "ruta alternativa sin peajes"
**KD:** 4-19 en la mayoría. Competition LOW.
**SERP (`peajes AP-7`, wave4):** autopistadelsol.com #1 (operador privado), Ministerio de Transportes #3 (PDF), SEITT #4. Ninguno tiene un calculador interactivo + comparador con ruta alternativa.
**Insight:** Las páginas de operadores solo dan sus tarifas. El usuario quiere "¿merece la pena pagar?" + trayecto sin peaje. Combinando datos de tarifas oficiales + OpenStreetMap routing = propuesta única.

### C9 — Operaciones DGT (salida, retorno, verano, Semana Santa)
**Intent real:** "¿Cuándo hay más tráfico? ¿A qué hora salgo para evitar el atasco del puente?"
**Volumen:** operación salida 1.9K + operacion salida 1.9K + dgt operación retorno 720 + operación salida DGT 260 + dgt operacion salida 260 + operación salida agosto 90 + verano operación salida (sin datos volumen) + "tráfico verano" (wave10 ideas)
**KD:** 0 en casi todas. Búsqueda muy estacional pero recurrente.
**SERP:** DGT publica notas de prensa. El periodismo de datos + histórico de flujos por fecha = ganador con SGE. Los datos de `HourlyTrafficProfile` + `TrafficFlow` + `AccidentMicrodata` permiten decir "el viernes 1 agosto a las 17h la A-4 tiene X veh/h de media".

### C10 — Commuter recurrente ("atasco Madrid hora punta")
**Intent real:** "¿Cuándo sale de casa para llegar a tiempo?" — búsqueda diaria, engagement máximo.
**Volumen:** atascos madrid tiempo real 880 + atascos (genérico) 9.9K + gran atasco hoy en madrid 2.4K + incidencias tráfico madrid 1.6K + estado tráfico madrid 320 + tráfico madrid ahora 590 + cortes tráfico madrid 1K + retenciones bilbao 40 + retenciones tráfico málaga hoy 140
**KD:** 0-18. Prácticamente sin competencia real en intent commuter.
**Insight:** Este es el cluster diferencial. Ver sección 4.

### C11 — Carreteras cortadas / última hora
**Intent real:** "¿Está cortada la carretera que necesito usar?" — urgencia alta.
**Volumen:** última hora carreteras cortadas hoy 2.4K KD=24 + ultima hora carreteras cortadas hoy 2.4K KD=29 + estado carreteras nieve 1.6K KD=27 + carreteras cortadas nieve madrid 260 + AP-7 cortada última hora 720 KD=0 + autopista AP-7 cortada hoy 110 KD=0 + cortes tráfico madrid 1K + estado carreteras 4.4K KD=65
**KD:** 0-65. El KD=65 de "estado carreteras" es de brand DGT (inaccesible). Los cortes específicos son KD=0.
**SERP (`estado carreteras`, wave4):** dgt.es #1 (mapa general), viamichelin.es #2, trafikoa.euskadi.eus #3, meteoruta.aemet.es #4. Todos ofrecen mapas genéricos, ninguno da búsqueda por carretera específica.

### C12 — IMD / Aforos / Datos técnicos
**Intent real:** "Datos de intensidad media diaria en una carretera" — data journalism, técnico/académico.
**Volumen:** imd carreteras 90 KD=0. Secundario en volumen pero enorme en diferenciación.
**Insight:** 14.400 estaciones aforo en BD. Nadie en España tiene esto en web pública accesible. Landing `/estaciones-aforo/[id]` + página de carretera con histórico IMD = autoridad de datos única.

### C13 — Alertas meteorológicas → tráfico
**Intent real:** "¿Puedo circular? ¿Necesito cadenas?"
**Volumen:** estado carreteras nieve 1.6K KD=27 + dgt carreteras nieve 880 KD=5 + carreteras cortadas nieve madrid 260 + carreteras cortadas valencia lluvia 170
**KD:** 0-27. Cross-cluster con meteo (fuera scope propio pero datos disponibles en colectores).

---

## 2. SERP Análisis

### Monopolio DGT — No competir en brand
| Query | DGT posición | Razón |
|---|---|---|
| "dgt estado carreteras" (49.5K, KD=57) | #1-2 | Brand explícito |
| "radares dgt" (49.5K, KD=57) | #1 | Brand + contenido oficial |
| "cámaras dgt" (1.6K, KD=31) | #1-3 | Brand + imagen embebida |
| "dgt incidencias" (KD=74) | #1 | Brand máximo |
| "cita previa dgt" (60.5K) | #1-3 | Sede electrónica, imposible |

**Regla:** No atacar queries con "dgt" + nombre de servicio DGT. Atacar queries sin brand ("estado carreteras", "atascos Madrid", "cámaras navacerrada").

### Donde los competidores están débiles

**viamichelin.es** — domina con mapa en "atascos [ciudad]" pero:
- No tiene datos propios ES: agrega HERE Maps sin valor añadido
- Sin histórico ni predicción
- UX desktop-first, mobile torpe
- Sin contenido localizado (misma plantilla para todas las ciudades)

**madrid.es** — top 1 en queries de Madrid por brand institucional pero:
- URL de 200 caracteres con parámetros vgnextoid
- No es linkable/compartible
- Sin API pública ni embed
- Carga lenta (jQuery 1.x)

**dieselogasolina.com** — aparece en "atascos Zaragoza", "atascos Málaga":
- Sitio de gasolineras que recicla feed DGT
- Sin valor propio, sin mapa interactivo
- Contenido 2015-2016 no actualizado

**trafico.elcorreo.com** — #1 en "tráfico Bilbao", "atascos Bilbao":
- Solo cubre Vizcaya/País Vasco
- Branded media (El Correo), difícilmente escalable
- Sin datos históricos

**trafico.sevilla.org y traficosevilla.es** — empatan en #1 "atascos Sevilla":
- Cobertura solo municipal
- Sin predicción
- traficosevilla.es tiene diseño 2012

### Análisis de features SERP

| Query | AI Overview | PAA | Top Stories | Local Pack |
|---|---|---|---|---|
| atascos Madrid | SI (async) | SI | NO | NO |
| atascos Zaragoza | SI | SI | NO | NO |
| atascos Málaga | SI | SI | NO | NO |
| estado carreteras | NO | SI | NO | NO |
| tráfico Madrid | NO | SI | SI | NO |
| tráfico Sevilla | NO | SI | SI | NO |
| radares dgt | NO | NO | SI | NO |
| cámaras dgt | NO | NO | NO | NO |
| peajes AP-7 | NO | SI | NO | SI (Knowledge Graph) |

**AI Overview en atascos de ciudad (Zaragoza, Málaga, Madrid):** Carga asíncrona — el contenido aún no está disponible en el SERP capturado. Esto confirma que Google está experimentando con AIOs en este vertical pero sin contenido estructurado claro que citar todavía. **Oportunidad: ser la fuente citada en AIOs** con datos en tiempo real + schema markup `TrafficIncident`.

**PAA recurrente** en casi todos los queries de ciudad. Las preguntas no están documentadas en los SERPs capturados (async), pero por patrón general son: "¿A qué hora hay menos tráfico en Madrid?", "¿Cuáles son las horas punta?", "¿Cómo ver el tráfico en tiempo real?". Contenido que responde directamente estas preguntas + datos horarios = PAA capture.

### Contenido con fecha antigua (oportunidad UX)

- `meteoruta.aemet.es` — aparece #4 en "estado carreteras". Sitio de 2009, no responsive, sin mapa moderno. Dominio autoridad (AEMET) pero tecnología muerta.
- RACE (`race.es/mapa-de-carreteras-espana/`) — aparece #2 en "radares DGT" y "cámaras tráfico España". Mapa embebido de HERE 2018, sin datos en tiempo real propios. UX anticuada. KD no compite directamente (es RACE brand + carreteras genérico).

---

## 3. White Space Específico

### Gap 1: "Accidente A-6 hoy" — KD=0, 2.4K/mes
Top resultado actual (por analogía con "atascos valencia" wave7): `lasprovincias.es/comunitat/accesos-valencia-trampa...` noticia del 17/04/2026 — texto sin mapa, sin stream, sin contexto histórico. Pierde relevancia en 2 horas.

**Nuestra propuesta:** `/carreteras/a-6` con:
- Feed DGT incidents filtrado por A-6 en tiempo real (`TrafficIncident`)
- Últimos 5 accidentes en el tramo (tabla `AccidentMicrodata` 2019-2023)
- Estado actual cámaras del tramo (`Camera` table)
- Radar de tramo activo si existe
- Resultado: página perenne que siempre tiene datos frescos cuando hay un accidente

### Gap 2: "Atascos Madrid" — madrid.es URL de 200 chars vs. datos reales
madrid.es ranking #1 con URL `/portales/munimadrid/es/Inicio/...` — nadie puede linkear esto. 20minutos está en #5 con etiqueta de noticias. viamichelin.es está en #3-4 con mapa pero sin predicción.

**Nuestra propuesta:** `/trafico/madrid` con mapa de 6.117 sensores Madrid (ya en `TrafficIntensity` con stream */5min) + distribución horaria + alertas activas. Madrid es el único municipio con este nivel de granularidad. Diferencial inmediato.

### Gap 3: "Cámaras navacerrada" — 14.8K/mes, KD=0-6
SERP actual: fotos de nieve en Google Images, blogs de senderismo, tiempo.com con webcam meteorológica. Ninguna cámara DGT específica de carretera.

**Nuestra propuesta:** Las cámaras DGT en el Puerto de Navacerrada (A-6, M-601) están en la tabla `Camera`. Landing `/camaras/navacerrada` con imágenes en tiempo real + condiciones de tráfico + alertas de nieve del tramo. KD=0, intención altísima en fines de semana de nieve.

### Gap 4: "ZBE [ciudad]" — 165K cluster casi sin competencia real
Las páginas municipales de ZBE son PDFs o tablas HTML sin dinámica. Ningún portal privado tiene todas las ZBEs de España con verificador de matrícula. La tabla `Zbe` en Prisma ya existe.

**Nuestra propuesta:** `/zbe/[ciudad]` + checker de etiqueta (introducir matrícula → ¿puede entrar?) + mapa de zona + horarios + multas. El cluster suma >230K combinado con KDs bajos.

### Gap 5: "Peaje AP-7 precio" + "ruta sin peaje"
Wave10 ideas confirma: "sin peaje Madrid Valencia" y "ruta alternativa sin peajes" tienen búsquedas. Los operadores solo dan sus propias tarifas. Ministerio solo PDF.

**Nuestra propuesta:** `/peajes/ap-7` con tabla actualizada de tarifas por tramo + calculadora de coste total origen-destino + comparativa con tiempo estimado por ruta alternativa. La tabla de peajes existe parcialmente en la plataforma.

---

## 4. Commuter Real-Time — El Diferencial

El usuario commuter tiene características únicas:
- **Frecuencia:** 2 visitas/día × 220 días laborables = 440 sesiones/año por usuario
- **Intent recurrente:** La misma query cada día laboral
- **Fidelización posible:** Bookmark, app PWA, notificaciones push
- **Datos disponibles:** `TrafficIntensity` (Madrid, 6K sensores, */5min), `HourlyTrafficProfile` (perfiles por hora/día/sensor), `TrafficIncident` (alertas DGT en tiempo real), `CityTrafficSensor` (Barcelona, Valencia, Zaragoza)

### El dashboard commuter

**Landing propuesta:** `/trafico/[ciudad]` → estado actual ciudad + retenciones activas en ejes principales
**Landing más específica:** `/carreteras/[roadId]/hoy` → perfil horario de la vía + alertas activas + cámaras del tramo

**Queries que activan este intent:**
- "tráfico Madrid ahora" 590/mes KD=0
- "atascos Madrid tiempo real" 880/mes KD=10
- "tráfico madrid hoy" 2.4K KD=12
- "gran atasco hoy en madrid" 2.4K KD=18
- "incidencias tráfico madrid" 1.6K KD=14
- "cortes tráfico madrid" 1K KD=0
- "retenciones bilbao" 40/mes (residual pero engagement máximo)

### Propuesta técnica del commuter dashboard

1. **Nivel ciudad:** `/trafico/madrid` — mapa con sensores coloreados por nivel de servicio (0-3) + top 5 retenciones activas + tiempo estimado de viaje en ejes principales (A-1, A-2, A-3, A-4, A-5, A-6, M-30, M-40)

2. **Nivel ruta:** `/mi-ruta/[origen]-[destino]` — estado ahora + perfil horario "¿a qué hora hay menos tráfico en este tramo?" + alerta si hay incidente activo en el recorrido

3. **Contenido evergreen para SEO:** Cada landing incluye sección "Hora punta habitual en [eje]" generada desde `HourlyTrafficProfile` — esto es lo que citan los AIOs y PAAs

**Diferencial vs. Waze/Google Maps:** Trafico.live es web pública indexable. Google Maps no indexa sus mapas de tráfico. Una landing con datos históricos + estado actual + schema markup `TrafficFlow` es citable en AIOs y PAAs donde los apps no lo son.

---

## 5. Landings Prioritizadas (20)

| # | URL | Keyword objetivo | Vol est. | KD | Intent | Stack data | Schema | Blocker |
|---|---|---|---|---|---|---|---|---|
| 1 | `/trafico/madrid` | "atascos Madrid hoy" | 10K+ | 10-18 | commuter/urgente | TrafficIntensity 6K sensores, HourlyTrafficProfile | TrafficAction + Map | Mapa requiere MapLibre con layer de sensores |
| 2 | `/zbe/[ciudad]` (x30) | "zbe [ciudad]" | 230K cluster | 0-43 | legal/multas | Tabla Zbe, polígonos | FAQPage + LegalService | Checker matrícula (AEMET-style) |
| 3 | `/baliza-v16` | "baliza v16 precio" + "dgt baliza v16 homologadas" | 18K+ | 0-11 | commercial/legal | DgtBeaconV16 + afiliado | FAQPage + ItemList | Lista homologadas requiere scraping periódico DGT |
| 4 | `/carreteras/[roadId]` (x200) | "estado [vía] hoy" / "accidente [vía] hoy" | 2-5K/vía top | 0-7 | urgente | TrafficIncident filtrado, Camera, Radar, AccidentMicrodata | RoadSegment + TrafficFlow | SSG con revalidación cada 5min (ISR) |
| 5 | `/camaras/[slug-punto]` (x1300+) | "cámaras [punto concreto]" | 14.8K navacerrada | 0-6 | informacional/urgente | Camera table + imagen DGT embed | ImageObject + Place | Proxy imagen DGT en tiempo real |
| 6 | `/trafico/[ciudad]` (x12 ciudades) | "tráfico [ciudad]" / "atascos [ciudad]" | 3-5.4K/ciudad | 4-51 | commuter | CityTrafficSensor, TrafficIncident | TrafficAction + Map | Requiere sensores activos por ciudad |
| 7 | `/operaciones-dgt` | "operación salida DGT" / "operacion retorno" | 5K+ combinado | 0 | estacional | HourlyTrafficProfile histórico, AccidentMicrodata | Event + FAQPage | Actualización manual por campaña |
| 8 | `/peajes/[ap-id]` (x12 autopistas) | "precio peaje AP-7" / "peajes AP-68" | 2K+ por AP | 4-19 | commercial | Tarifas estáticas + alternativa ruta | Product + FAQPage | Fuente tarifas oficial (Ministerio PDFs) |
| 9 | `/radares/[carretera]` (x50 vías) | "radar [carretera]" / "radares tramo A-6" | 500-2K/vía | 0-10 | informacional | Radar table + tramos de vigilancia DGT | GeoCoordinates + Place | Sync DGT tramos: URL pública disponible |
| 10 | `/incidencias/[ciudad]` | "cortes tráfico madrid hoy" / "última hora carreteras cortadas" | 4K+ | 0-29 | urgente | TrafficIncident filtrado por ciudad | NewsArticle + TrafficAction | Feed en tiempo real requiere TTL <5min |
| 11 | `/estado-carreteras` | "estado carreteras" / "estado carreteras nieve" | 6K | 27-65 | urgente/informacional | TrafficIncident + VariablePanel + Camera | TrafficAction nacional | KD=65 para genérico: atacar long-tail "estado carreteras nieve" |
| 12 | `/carreteras/[roadId]/hoy` | "tráfico [AP-7] hoy en directo" | 500-2K/vía | 0 | commuter/real-time | TrafficIntensity + TrafficIncident + HourlyProfile | TrafficFlow + TrafficAction | ISR 5min + estructura URL nueva |
| 13 | `/puntos-negros` | "puntos negros carretera" | 30/mes KD=0 | 0 | data journalism | AccidentMicrodata 500K registros | Dataset + Place | Visualización clustering por coordenada+tramo |
| 14 | `/paneles-dms/[carretera]` | "paneles dms [vía]" / "señal variable AP-7" | 200-500 | 0 | informacional | VariablePanel table | Place + LiveBlogPosting | Bajo volumen, alta fidelización commuter |
| 15 | `/trafico/espana` (mapa nacional) | "tráfico en directo" / "dgt estado carreteras" | 9.9K | 51-57 | informacional/urgente | TrafficIncident nacional + V16 balizas activas | TrafficAction + Map | Mapa nacional pesado, lazy load esencial |
| 16 | `/accidentes/[carretera]` | "accidentes AP-7" / "accidente A-6 hoy" | 8K+ combinado | 0-9 | urgente + data | AccidentMicrodata + TrafficIncident live | Dataset + TrafficAccident | Schema `TrafficAccident` no oficial, usar Event |
| 17 | `/estaciones-aforo/[slug-vía]` | "imd [carretera]" / "aforo [carretera]" | 200+ | 0 | data | TrafficFlow + TrafficStation por vía | Dataset + MeasurementTechnique | Ya existe `/estaciones-aforo` — añadir detalle por vía |
| 18 | `/trafico/andalucia` (+ 16 CCAA) | "estado carreteras andalucía" / "carreteras cortadas sevilla" | 2K+ | 0-30 | urgente regional | TrafficIncident + Camera filtrado CCAA | TrafficAction regional | Segmentación por CCAA en BD Prisma |
| 19 | `/operaciones-dgt/[año-puente]` | "operación puente mayo 2026" | estacional | 0 | estacional/editorial | AccidentMicrodata histórico puentes + predicción | Event + Dataset | Requiere creación manual cada puente |
| 20 | `/alertas-trafico` (feed RSS + API) | (no SEO directo) | — | — | technical/media | TrafficIncident stream | DataFeed + LiveBlogPosting | Para referenciar desde medios → autoridad |

**Categorías:**
- Per-entidad infraestructura (SSG): #5 cámaras (1.300+), #9 radares (50+ vías), #14 paneles
- Per-vía real-time: #4 /carreteras/[roadId], #12 /carreteras/[roadId]/hoy
- Per-ciudad densidad: #1 /trafico/madrid, #6 /trafico/[ciudad]
- Guías legales: #2 /zbe/[ciudad], #3 /baliza-v16, #8 /peajes/[ap-id]
- Data journalism: #13 /puntos-negros, #17 /estaciones-aforo/[vía], #16 /accidentes/[carretera]

---

## 6. Predictive Commuter — Roadmap ML

### Datos disponibles en producción
- `HourlyTrafficProfile`: media por sensor × hora_día × día_semana — construido de forma continua desde la instalación
- `TrafficIntensity`: 6.117 sensores Madrid, rolling 48h, actualización cada 5min
- `AccidentMicrodata`: 500K accidentes 2019-2023 con fecha, hora, tramo, tipo

### Modelo propuesto (MVP, no requiere ML complejo)

**Input:** sensor/tramo + hora + día de la semana
**Output:** "Ahora: 3.200 veh/h (+47% sobre la media de este tramo a esta hora). Espera estimada: 18 min adicionales vs. el viaje fluido."

**Implementación en 3 pasos:**
1. **Baseline:** Para cada sensor, calcular P25, P50, P75 de intensidad por hora×día desde `HourlyTrafficProfile`. Ya disponible.
2. **Alerting:** Si intensidad actual > P75 × 1.2 → "tráfico inusualmente denso". Si existe `TrafficIncident` activo en el tramo → "accidente activo, añadir X min".
3. **Predicción corta (+1h):** Regresión simple sobre los últimos 30 minutos del sensor. RMSE estimado <15% para ventanas de 1h.

### Landing que sirve esto
`/carreteras/[roadId]/hoy` — estructura:
- Mapa del tramo con sensores coloreados en tiempo real
- Widget: "Ahora vs. media habitual" (gauge)
- Gráfico: próximas 3 horas (modelo simple) vs. histórico habitual
- "Mejor hora para salir hoy" → respuesta directa que SGE/AIO adora

**Por qué SGE lo referencia:** Respuestas directas y factuales ("en la A-6 entre Guadarrama y Madrid las retenciones habituales del viernes tarde empiezan a las 16:30 con un pico a las 18:00") son exactamente el tipo de contenido que Google AI Overview cita cuando no hay una sola página con esa precisión.

---

## 7. PT Carreteras

### Volumen observado
- "acidente na A1" (PT): 12.1K/mes KD=0 — top resultado son noticias locales sin mapa
- "transito ponte 25 de abril agora": 880/mes
- "transito A1 agora": 880/mes
- "transito ic19 agora": 720/mes
- "transito ponte vasco da gama hoje": 590/mes
- "transito A2 hoje": 320/mes
- "transito Lisboa": presente en universo
- Radares portugal (wave4): radaresdeportugal.pt y radaresavista.pt dominan — sitios especializados sólidos

**Total cluster carreteras PT estimado:** 8-15K/mes en búsquedas de estado/accidentes/tráfico

### Colectores disponibles vs. necesarios
**Disponibles:** `portugal-accidents` (accidentes históricos), `portugal-weather`, `portugal-fuel`
**Faltante:** NO existe colector de tráfico en tiempo real PT. InfraestruturasdePortugal.pt tiene una API básica pero con datos más escasos que DGT.

### Recomendación
**No prioritario a corto plazo.** Razones:
1. El volumen (~10K) es 10x menor que solo el cluster "atascos Madrid" en ES
2. Los competidores PT (radaresdeportugal.pt, viaverde.pt) tienen dominio local fuerte
3. Sin colector de tráfico real PT, la propuesta de valor se reduce a accidentes históricos y estado genérico
4. El esfuerzo de implementar y mantener un stack PT paralelo supera el retorno a 12 meses

**Caso favorable a largo plazo:** Si trafico.live alcanza autoridad de dominio >40 y quiere expandir, la propuesta "mismo producto, misma UX, datos PT" tiene sentido por coste marginal. El gancho sería la frontera (conductores ES que cruzan frecuentemente a PT) y los turistas PT en España.

---

## 8. Roadmap 3 Fases

### Fase 1 — Quick Wins (Semanas 1-4)
**Objetivo:** 30-50K impresiones orgánicas mensuales nuevas

1. **`/trafico/[ciudad]`** (Madrid prioritario) — mapa de sensores `TrafficIntensity` + retenciones activas. Ya hay datos. Solo requiere route + componente.
2. **`/baliza-v16`** — landing de guía completa: lista homologadas (scraping DGT puntual), precios, flow de validación, afiliado. 18K vol, KD<11.
3. **`/zbe/madrid`** y `/zbe/barcelona` — las dos ciudades con más volumen. Datos en `Zbe` table. Checker matrícula simple (etiqueta DGT por tipo de combustible/año).
4. **`/carreteras/[roadId]`** SSG para top 20 vías (A-1, A-2, A-3, A-4, A-5, A-6, AP-7, AP-6, M-30, M-40...) con estado actual + cámaras del tramo + últimos incidentes. Revalidación ISR 5min.
5. **Schema markup `TrafficAction`** en `/incidencias` existente — para capturar PAA + potencial AIO.

### Fase 2 — Escalado masivo SSG (Meses 2-4)
**Objetivo:** 100K+ impresiones. Activar el volante de entidades.

1. **`/camaras/[slug]`** — 1.300 cámaras DGT con imagen en tiempo real, embed proxy + contexto de carretera. Ya disponible en BD `Camera`.
2. **`/radares/[carretera]`** — 50 vías principales. Datos DGT tramos de vigilancia + tipo de radar (fijo/tramo/móvil).
3. **`/zbe/[ciudad]`** para las 30 ciudades con ZBE operativa. Datos en tabla `Zbe`.
4. **`/peajes/[ap-id]`** — 12 autopistas con peaje activo. Tarifas 2026 + ruta alternativa.
5. **`/operaciones-dgt`** — landing evergreen + páginas por campaña (puente mayo 2026, Semana Santa, verano).
6. **Commuter dashboard:** `HourlyTrafficProfile` → widget "mejor hora para salir" en cada página de carretera.

### Fase 3 — Predicción + Autoridad de datos (Meses 5-12)
**Objetivo:** Convertirse en la fuente citada por medios y AIOs. 300K+ impresiones.

1. **Modelo predictivo simple** sobre `HourlyTrafficProfile` + live `TrafficIntensity` — respuesta directa "esta tarde la M-30 tardará X minutos más de lo habitual".
2. **`/puntos-negros`** — mapa de accidentalidad de `AccidentMicrodata` (500K registros). Data journalism que genera backlinks naturales desde medios.
3. **`/accidentes/[carretera]`** — histórico + alertas en tiempo real. El único portal con ambas capas.
4. **Alertas push (PWA)** — convertir commuter recurrente en usuario registrado. El SEO es el canal de captación, la retención es via push.
5. **API pública documentada** — `/api/trafico` con tiers Stripe ya implementados. Los medios que citan datos de DGT pasarán a citar trafico.live si la API es más cómoda.

---

*Fuentes primarias: `03-keyword-universe-full.csv` (70.633 filas ES+PT), SERPs wave4 (`atascos Madrid`, `cámaras DGT`, `estado carreteras`, `peajes AP-7`, `radares DGT`), city SERPs wave7 (20 ciudades), KD wave9 (229 términos de tráfico rodado con KD verificado), datos de stack desde `CLAUDE.md` (colectores, tablas Prisma).*

---
**Return (50 palabras):** El cluster carreteras suma ~350K vol/mes con KDs mayoritariamente 0-27. Los tres grandes gaps son: (1) accidentes por vía con KD=0 donde los periódicos pierden relevancia en horas, (2) ZBE con 230K sin checker dinámico, y (3) el commuter dashboard diferencial que ningún competidor ofrece.
