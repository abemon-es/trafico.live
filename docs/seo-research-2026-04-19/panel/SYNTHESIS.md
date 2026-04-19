# Panel de Expertos — Síntesis y Veredicto
**Fecha:** 2026-04-19
**Agentes:** moat-redteam · data-surface-audit · competitor-ux-teardown · economics-reality-check
**Propósito:** Responder "¿cómo competimos de verdad?" después de verificar cada asunción del plan `10-total-domination.md`.

---

## VEREDICTO EJECUTIVO

**El plan tiene la dirección correcta y los números mal.** Las keywords son reales, el gap competitivo existe, y el moat de datos es estructural. Pero (a) la escala es **4× menor** que la prometida (15K URLs defendibles vs 65K), (b) la ventana comercial es **10× menor** que la prometida (€1-3K/mes en T+180d vs €18K), y (c) la secuencia de verticales está **equivocada** (empezar por trenes, no meteo). Con estas correcciones el plan es accionable y el moat es real; sin ellas es un castillo de arena.

**Recomendación: GO con re-scope.** 3 verticales en lugar de 7, 15K URLs en lugar de 65K, 20-24 semanas en lugar de 12, y un MVP de 4 semanas que prueba la tesis antes de comprometer el resto.

---

## 1. Dónde los 4 agentes coinciden (unánime)

1. **La data es el moat real, no la UX.** 11 de 12 competidores tienen zero Schema.org, 12 de 12 no cruzan verticales. Esa es la ventaja uncontested — no "nuestro diseño es más bonito".
2. **El plan confunde "URLs generables" con "URLs defendibles".** De las 65K prometidas, solo 14-16K tienen data real suficiente para no caer como thin content. PT es mayormente aspiracional (colectores IPMA-forecast, APA, CP inexistentes).
3. **Fallo silencioso de colectores es el riesgo existencial.** Solo `collector-ais` tiene healthcheck. Servir 15K landings con data obsoleta es un fallo de confianza que Google detecta y castiga a escala.
4. **Los P0 del VERDICT audit (canonical, sitemap, og) bloquean todo.** Cada mes de retraso quema un ciclo de ranking (6-8 semanas). Sprint 1 no es opcional.
5. **Los timelines son optimistas.** 12 sprints ≠ 12 semanas. Realista: 20-24 semanas con 1 dev senior + mantenimiento de 43 colectores en producción.

## 2. Dónde los agentes corrigen al plan

| Asunción del plan | Veredicto del panel | Fuente |
|---|---|---|
| 65.000 URLs programáticas posibles | **14-16K defendibles**. 35K con LLM prose. 65K imposible. | Agent 2 (data-surface) |
| "UX 2010-2015" en todos los competidores | **Solo 6/12**. eltiempo.es (28/40), iqair (26), FR24 (24), viamichelin (25), tempo.pt (26) son modernos | Agent 3 (competitor-ux) |
| €18K/mes revenue en T+180d | **€1-3K/mes realista**. €18K posible en T+18m con 400K+ sesiones | Agent 4 (economics) |
| "KD ≤20 = trivialmente ganable" | KD ≤10 es el umbral seguro. DataForSEO KD no mide autoridad institucional (DGT, AEMET, Renfe) | Agent 4 |
| "AI Overview solo 2,4% → ventana 12-24m" | Global 48% feb-2026. Pero **queries locales/real-time solo 7%** — nuestro core está estructuralmente protegido | Agent 4 |
| Ciudad mega-hubs rankeando por "madrid" (15M vol) | March 2026 core update demoted broad aggregators. Hay que **descomponer** en `/madrid/tráfico`, `/madrid/tiempo` | Agent 4 |
| "Meteo vertical #1 por 40M volumen" → empezar ahí | eltiempo/aemet tienen 15 años de autoridad. **Empezar por ferroviario**: KD 0-5, 450K vol, data ya live, moat único (GPS + puntualidad) | Agent 1 |
| 12 afiliados listos en Sprint 10 | **4 de 12 no tienen programa** (Waylet, Solred, Iberdrola EV, Wallbox). Rastreator/Acierto requieren negociación. Aplicar **día 1**, no Sprint 10 (cooldowns de rechazo 6-12 semanas) | Agent 4 |
| News-sitemap → Discover traffic | Feb 2026 Discover Core Update requiere E-E-A-T + author pages para YMYL. El sitio no tiene autores | Agent 4 |

## 3. Dónde el panel amplifica el plan (ventajas ocultas)

1. **Real-time data es AI-Overview-proof** (Agent 4). Google evita AI Overview en queries de datos vivos por precisión — 7% cobertura local vs 48% global. Es la única categoría SEO donde la disrupción AI es estructuralmente baja. Moat duradero.

2. **Cross-vertical por ciudad es REAL para Madrid y Barcelona** (Agent 2). Madrid hoy puede servir 8+ verticales simultáneamente con data live. Cercanías GPS + LD fleet GPS + incidents + fuel + AQ + ZBE + metro live en una sola página **no existe en ningún sitio**. Falta solo la plantilla `/ciudad/[slug]`.

3. **10 años de histórico CNMC** (Agent 1). ~100M registros de precio diario × 12K estaciones desde 2016. dieselogasolina.com (el monopolio) sirve históricos como **PNG estáticos** (Agent 3 verified). Un chart interactivo + DataFeed schema leapfroguea el SERP completo.

4. **API premium tier como revenue principal** (Agent 4). Con Stripe FREE/PRO/ENTERPRISE ya en el código, 1 cliente enterprise (fleet manager, logística) = €500-2000/mes = equivalente a 3 meses de afiliados realistas. Independiente de rankings y cookies.

5. **Evidencias duras de debilidad competitor específicas** (Agent 3):
   - `tempo.pt/lisboa` devuelve 404 hoy — PT meteo city-level roto estructuralmente
   - `aemet.es` sirve XHTML 1.0 con badge W3C — arquitectura pre-smartphone
   - `maisgasolina.com` texto literal: "Prices updated within last 14 days" — retraso verificable
   - `etraffic.dgt.es` es SPA sin HTML estático — no indexable
   - Renfe entierra el real-time 3 clicks deep y bloquea crawlers

---

## 4. EL POSICIONAMIENTO COMPETITIVO REAL

No somos "mejor UX que los competidores" — algunos son de hecho modernos. Somos **el único sitio ES/PT que cumple las 4 condiciones simultáneamente:**

1. **Schema.org completo** sobre datos live (11/12 competidores: 0 schema)
2. **Cross-vertical por ciudad** (12/12 competidores: 0 integración)
3. **Frescura verificable** (minutos/horas vs 14 días de maisgasolina o SPAs no indexados)
4. **AI-Overview-proof** por naturaleza de data real-time (7% vs 48% de cobertura)

Esa es la tesis de marketing. Lo demás son features.

---

## 5. ESTRATEGIA REVISADA — 3 verticales, no 7

### Sprint 0 (semana 1) — PREREQS OBLIGATORIOS

Sin esto, el resto del plan es papel.

- **Fix P0 del VERDICT audit**: canonical en 32 páginas, sitemap +4K URLs, og:images en 117
- **Healthchecks por colector**: cada uno escribe un heartbeat a Prometheus o `last_run_at` a DB, con alertas
- **Grafana dashboard de frescura**: panel por tarea + SLA + alerta si stale
- **Aplicar a afiliados YA**: Parclick, DiscoverCars, DirectFerries, Booking, Skyscanner, Omio (cooldown 6-12 sem si rechazo)
- **Schema.org base**: FAQPage + BreadcrumbList + Organization en layout root

### Sprint 1-3 (semanas 2-4) — VERTICAL #1: FERROVIARIO

Por qué primero: KD 0-5, data live ya en DB, moat único (GPS + puntualidad), competencia débil (Renfe oculta real-time 3 clicks), vol 450K en 5 keywords top.

- `/trenes/estacion/[slug]` × **20 top** (Atocha, Sants, Chamartín, Santa Justa, Valencia JS, etc.) con StationBoard live + schema TrainStation
- Incluir analytics únicas: puntualidad por marca, histórico de retrasos de esa estación, próximas salidas en vivo
- `/trenes/cercanias/[network]` × 12 redes con mapa live
- Cross-link a `/ciudad/[slug]` y `/aviacion/aeropuertos/[iata]` relacionados
- **MVP de validación en semana 4**: si estas 20 páginas no generan impresiones en GSC en 6 semanas, hay bug de indexación — mejor saberlo en semana 4 que en semana 12

### Sprint 4-6 (semanas 5-9) — VERTICAL #2: CIUDAD MEGA-HUBS (descompuestos)

Por qué segundo: el cross-vertical moat es la ventaja uncontested más clara del panel. Pero con **descomposición por intent** (corrigiendo la asunción del plan).

- **No** `/ciudad/madrid` monolítico — **sí** `/madrid/tráfico`, `/madrid/tiempo`, `/madrid/gasolineras`, `/madrid/aire`, `/madrid/metro`
- Cada uno con data live de su vertical + widgets cross-vertical pequeños al pie
- Solo **top-20 ciudades ES** (Madrid, Barcelona, Valencia, Sevilla, Bilbao, Málaga, Zaragoza, Palma, Vigo, Valladolid, Murcia, Alicante, Córdoba, Gijón, Granada, A Coruña, Las Palmas, Santa Cruz, Pamplona, Oviedo)
- 20 ciudades × 5 intents = 100 landings foundations, todas con data suficiente validada
- Plantilla **`src/app/ciudad/[slug]/[vertical]/page.tsx`** (nueva, no existe hoy)

### Sprint 7-9 (semanas 10-15) — VERTICAL #3: COMBUSTIBLE ES

Por qué tercero: monopolio derrocable (dieselogasolina.com UX 18/40, históricos PNG), afiliado económico real (Waylet/Solred sin program pero con deeplink), moat de 10 años CNMC.

- `/gasolineras/[ciudad]` × 800-1000 municipios con suficiente density
- `/gasolineras/[id]` × 11K estaciones con chart histórico interactivo (Recharts + DataFeed schema)
- `/precio-gasolina-hoy` + `/precio-diesel-hoy` con predicción sube/baja mañana
- Integración deeplink Waylet/Solred/Galp (no afiliado, pero mejora UX y engagement)

### Sprint 10-12 (semanas 16-20) — EXPANSIÓN

Solo después de validar que sprints 1-9 funcionan. Tres tracks paralelos:

- **Track A — Verticales secundarios**: Aviación (46 aeropuertos con boards live), Marítimo (AIS + puertos), Calidad aire ES (500 ciudades)
- **Track B — PT fundamentals**: colectores IPMA-forecast, APA air quality, CP Portugal. Sin estos, PT es fantasía
- **Track C — Meteo selectivo**: NO entrar contra aemet/eltiempo nacional. Solo meteo integrado en ciudad-hubs + nichos (meteo marina, radar lluvia)

### Sprints 13-24 (meses 6-12) — REAL REVENUE ENGINE

- **API premium tier** con casos de uso documentados (fleet management, logística, medios)
- **Meta-comparador `/ir`** (ferry + tren + bus + avión + alquiler combinados)
- **Legal/normativa pillars**: baliza V-16 (246K), etiqueta ambiental (150K), ZBE guía (100K) — estas keywords tienen KD bajos y son genuinamente informativos
- PT verticales una vez colectores existen

---

## 6. HEADER / FOOTER / SEARCH — REVISADO

Informado por las correcciones del panel, cambia la jerarquía vs mi propuesta anterior:

### HEADER — 6 paneles (no 7), orden por moat + data disponible

```
[logo] [📍 España ▾]
  Trenes · Carretera · Combustible · Aviación · Marítimo · Más ▾
                              │ Profesional ▾  [⌘K]  [ES/PT]  [👤]
```

| # | Panel | Razón del orden | Data state |
|---|---|---|---|
| 1 | **Trenes** ★ | Vertical #1 del plan revisado. Moat único (GPS + puntualidad). KD 0-5 | Data lista |
| 2 | **Carretera** | Live incidents + IMD + cámaras + radares + ZBE + meteo integrada | Data lista para top ciudades |
| 3 | **Combustible** | Monopolio derrocable. Histórico CNMC 10 años | Data lista |
| 4 | **Aviación** | OpenSky + AENA. Radar ES/PT gratis | Data lista (AENA) |
| 5 | **Marítimo** | AIS + puertos. Ferry solo afiliado | Data lista ES |
| 6 | **Más ▾** | Meteo (integrada), Calidad aire, Transit, Ciudad, Legal, Blog | Mix |

**Meteo pierde el panel propio** porque: (a) pelearíamos contra 15 años de autoridad, (b) la AI Overview sube rápido en queries genéricas, (c) nuestra data meteo hoy solo cubre 202 municipios (no 2052). Se integra dentro de Carretera y dentro de cada ciudad-hub como widget, no como vertical standalone.

**Cada mega-menú debe mostrar**:
- HERO con data live verificable (métrica con timestamp visible: "Última actualización: hace 2 min")
- Sección "PT 🇵🇹" visualmente marcada si hay data (esconder si no)
- Pills **data-driven** del CSV `13-winnable-full.csv` filtradas por panel
- CTA afiliado contextual al pie (parking si aeropuerto, alquiler si ciudad)

### SEARCH (⌘K) — tabs alineadas a los 6 paneles

Cambios vs propuesta anterior:
- **Tab "Meteo" se elimina** — se busca desde cada ciudad (`/madrid/tiempo` aparece en tab "Ciudad")
- **Tab "Ciudad"** añadido — refleja el descompuesto
- **Tab "Legal"** mantenido — baliza V-16/etiqueta/ZBE es 1M volumen KD bajo
- **Intent chips** construidos del CSV: top 10 keywords de cada tab que podemos rankear
- Cada resultado lleva **badge de frescura** ("hace 2 min" / "hoy 08:00") — diferencial visual directo vs competidores

### FOOTER — 6 columnas + 2 strips

Cambios vs propuesta anterior:
- **Columna "Modos"** ordenada por priority revisada (Trenes primero)
- **Sección PT se esconde** hasta que los 3 colectores (IPMA-forecast, APA, CP) existan — no linkear a páginas sin data
- **Columna Legal/Normativa** refuerza (1M volumen keywords informativos KD bajo)
- **Strip "Herramientas"** arriba con los 8 jobs-to-be-done de más CPC (afiliación)
- **City strip** abajo con **top 20 ciudades** (no 52 provincias — densidad > completitud hasta validar indexación)

Todas las URLs del footer deben **existir y tener data**. Cada link-404 o link-thin daña autoridad. Auditar antes de publicar el nuevo footer.

---

## 7. MVP DE 4 SEMANAS — el experimento crítico

**Hipótesis a validar**: keywords KD 0-10 con data live + schema completo rankean top-10 en 4-6 semanas para un sitio nuevo sin backlinks.

**Construir:**
- Sprint 0 P0 fixes (canonical + sitemap + og + schema base)
- `/trenes/estacion/[slug]` × 20 top estaciones con:
  - StationBoard live (partidas + llegadas)
  - Schema TrainStation + FAQPage + BreadcrumbList
  - Interlink a 7 páginas (7-rule)
  - og:image generada dinámica
  - Historial de puntualidad con Recharts
- Submit sitemap a GSC + ping news-sitemap

**Medir:**
- GSC impresiones/clicks/posición por URL — daily
- Crawl budget (Coverage report GSC)
- SERP features que ganamos (rich result test)
- CWV verificado (PageSpeed Insights)

**Criterio de éxito (6 semanas desde publicación):**
- Mínimo 10 de 20 URLs indexadas y con impresiones
- Mínimo 3 URLs en top 20 Google
- Mínimo 1 URL en top 10
- Rich results apareciendo para 5+ URLs

**Criterio de fallo:**
- <5 URLs indexadas → problema de indexación, re-auditar técnica antes de escalar
- 0 URLs en top 50 → keywords más difíciles de lo que DataForSEO dice, re-calibrar KD

Si pasa → arrancar Sprint 4 (ciudad-hubs). Si falla → diagnosticar antes de construir más.

---

## 8. LAS 3 PREGUNTAS QUE IMPORTAN, RESPONDIDAS

### ¿Cuál es el único vertical por el que empezar?
**Trenes.** KD 0-5 en estaciones top (Atocha, Sants, Santa Justa), vol 450K c/u, data ya en DB (Cercanías GPS + LD fleet), moat único (nadie tiene puntualidad histórica), competidor débil (Renfe oculta real-time). Meteo pelea contra 15 años de eltiempo/aemet y el 48% AI Overview global. Trenes no.

### ¿Cuál es el riesgo más subestimado?
**Silent collector failure a escala.** 15K páginas apuntando a data de 43 colectores donde solo 1 tiene healthcheck. No es un bug cosmético — es un problema de confianza Google. Grafana + alertas por colector debe ir en Sprint 0, no en "algún día".

### ¿Qué MVP prueba la tesis en 4 semanas en lugar de 12?
**Top 20 estaciones de tren con el stack completo** (StationBoard + schema + interlink + og + RichResults). Medición GSC semanal. Semana 6 es el veredicto: si las keywords KD 0-5 ranquean, el plan funciona. Si no, replantear antes de comprometer 9 sprints adicionales.

---

## 9. NÚMEROS REVISADOS

| Métrica | Plan original | Revisado panel | Delta |
|---|---|---|---|
| URLs programáticas posibles | 65.000 | 14-16.000 | -76% |
| Verticales simultáneos | 13 | 3 prioridad + 3 secundarios | -46% |
| Timeline | 12 semanas | 20-24 semanas | +100% |
| Revenue T+180d | €18.000/mes | €2.500-5.000/mes | -75% |
| Revenue T+12m | ~€50.000/mes | €10-15.000/mes | -75% |
| Revenue T+24m (optimista) | €200.000/año | €80-120.000/año | -50% |
| Afiliados activables | 12 | 7-8 (4 no tienen program) | -35% |
| URLs afiliadas T+180d | ~800 | ~100 | -87% |
| Moat durable | "Datos reales" | "Datos reales AI-Overview-proof + Schema + Cross-vertical" | + |

---

## 10. DECISIÓN BINARIA PARA EL USUARIO

**Opción A — GO con re-scope** (recomendada por el panel):
- Ejecutar Sprint 0 (P0 + healthchecks + schema base) **esta semana**
- MVP de 20 estaciones en 4 semanas
- Decisión de continuar basada en resultados GSC en semana 6
- Budget T+180d realista: €2.5-5K/mes revenue

**Opción B — NO-GO**: archivar research, aceptar que trafico.live se queda como proyecto técnico/portfolio.

**Opción C — GO al plan original** (no recomendada): con los datos del panel, hacerlo significaría comprometer 12 sprints para descubrir en mes 4 que la mitad de las URLs son thin content, colectores fallan en silencio, y el revenue no llega.

El panel vota unánimemente por **A**.

---

**Archivos del panel:**
- `moat-redteam.md` — Agent 1
- `data-surface-audit.md` — Agent 2
- `competitor-ux-teardown.md` — Agent 3
- `economics-reality-check.md` — Agent 4
- `SYNTHESIS.md` — este documento

**Próxima acción sugerida:** aprobar Opción A → arrancar Sprint 0 (canonical + sitemap + og + healthchecks colectores).
