# Argos Atlas, God's Eye View (+ map-poster reel): what trafico.live can learn

*Research date: 2026-10-18. Nothing in the trafico.live repo was modified (read-only checks only).*

Legend: **[REV]** plausibly brings direct revenue · **[DIST]** brings users, links, press or creators · **[EYE]** eye-candy only · Effort **S** ≤ 2 days · **M** ≤ 2 weeks · **L** > 2 weeks

---

## 0. What the reels are (verified from og tags + thumbnails; videos not watched)

| Reel | Author | Caption | Engagement | What the thumbnail shows |
|---|---|---|---|---|
| [Dd23G0NPwOr](https://www.instagram.com/jutexok/reel/Dd23G0NPwOr/) | **Jutex (@jutexok)**, 125K followers, Spanish-language | "Argos atlas nos da acceso a todo lo que sucede en el planeta en vivo! 🌎" | **174K likes**, 319 comments (28 Sep 2026) | A Samsung monitor showing a flat world map packed with dots (cameras, flights, ships): Argos Atlas |
| [Dd3KF77vyvM](https://www.instagram.com/jutexok/reel/Dd3KF77vyvM/) | Jutex (@jutexok) | "3 proyectos para ver el mundo en vivo 🌎" | 9.6K likes, 69 comments (28 Sep 2026) | Three monitors: a flat dense map (≈ Argos Atlas), a globe with dark side panels (≈ World Monitor), and a globe with green orbit dots (≈ God's Eye View). **Which 3 projects is inferred, not confirmed.** |
| [Dd1Dh2YBmQp](https://www.instagram.com/setupsai/reel/Dd1Dh2YBmQp/) | **Tony Chen (@setupsai)**, 4M followers, "Powerful websites you should know" series | "Powerful websites you should know (part 1161) get map poster of almost any city #map #citymap #poster" | 28K likes, 60 comments (28 Sep 2026) | Desk setup. The site isn't named in the caption, so the **exact tool is unidentified**. It belongs to the "OSM city map poster generator" category popularised by [MapToPoster](https://hellogithub.com/en/repository/originalankur/maptoposter) (MIT, ~13k★) and its web clones. |

All three reels were posted on the **same day**. These "websites you should know" accounts act as a distribution channel for live-map products. A single Spanish-language creator with 125K followers got Argos Atlas **174K likes**.

---

## 1. ARGOS ATLAS: argosatlas.com (commercial, freemium)

Sources: [home](https://argosatlas.com/) · [pricing](https://argosatlas.com/en/pricing/) · [sources & method](https://argosatlas.com/en/fuentes-y-metodologia/) · [legal](https://argosatlas.com/en/aviso-legal/) · [blog](https://argosatlas.com/en/blog/) · [X @argos_map](https://x.com/argos_map). Every figure below is **self-reported**.

**What it is.** A browser-based world map ("200,000+ live cameras to spy on the world") that fuses:
- **Cameras.** 200,000+ public traffic cameras and webcams in 190+ countries, 18,838 with live video. They come from DOT and city portals. Each camera cites its source, and only the latest low-res frame is kept for free users.
- **Flights and ships.** ADS-B flights (~12–17k live, military flagged, OFAC-sanctioned aircraft matched). Planes are dead-reckoned over oceans and drawn grey as "estimated". AIS ships (~21k at sea), with "dark ships" that switch off AIS flagged and 1,539 OFAC vessels matched. Straits and port congestion views.
- **Conflict.** 16 war frontlines, GeoConfirmed verified events, GDELT news, UCDP history, GPS-jamming zones.
- **AI news layer.** AI geocodes the press hourly into risk zones.
- **Infrastructure.** Power plants, data centres, dams, submarine cables, airports.
- **Live events.** USGS quakes, NASA FIRMS fires, WHO outbreaks, ISS/satellites, live ATC audio.
- **"VIPs and companies".** Billionaires' jets and yachts light up gold. Stocks, and **885 Polymarket prediction markets** placed on the map with an "ARGOS value signal".
- **Views.** A flat 2D map, plus a 3D globe with 3D aircraft in real airline livery and a first-person "on board" view (3D is paid).

**Business model** (pricing page, 18 Oct 2026):
- **Free tier.** Requires a free account, carries ads, and limits full camera views ("3 full cameras a day"). It appears to use rewarded ads ("no camera ever asks you to watch a video" is listed as a Pro perk) and has country blocks.
- **24-hour pass.** A one-off payment for unlimited cameras.
- **OUTPOST:** €15.99/mo, or €44.99/yr (≈€3.75/mo).
- **DISTRICT:** €56.99/mo list, or €134.99/yr (≈€11.25/mo). Includes 15 cameras recorded with a 24 h archive, 10k AI credits, 7-day flight/ship history, 5 geofences, "Alert me" via Telegram, daily e-mail brief, 3D globe, videowall.
- **DIVISION:** €199/mo, or €809/yr. 10 seats, 150 recorded cameras, 90-day history, 50 geofences.
- **AGENCY:** **€1,049.99/mo** or €10,499/yr. Commercial use, **API + MCP** ("coming soon").
- **Discounting.** Aggressive anchoring ("−76%/−80%", first month −50%). Prices differ between pages: the WorldCam comparison quotes DISTRICT at €19.95, struck through from €56.99.
- **Payments.** [Freemius](https://freemius.com) acts as merchant of record.

**Who runs it.** The operator is an undisclosed "duly incorporated company", with details given only on request. The URL slugs are Spanish (`/fuentes-y-metodologia/`, `/aviso-legal/`, `/cuenta/`) and the showcased cameras are Spanish (Alicante, Port Olímpic, A Coruña, M-45 Madrid). That suggests a **Spain-based team**, but this is an inference. Stack: **unknown**. Direct fetches timed out and the reader proxy returned text only.

**How it gets attention.**
1. **Short-form creators.** The Jutex reel above.
2. **Programmatic SEO.** About 270 blog URLs on the index alone: "X traffic cameras" for every US state, Spanish region, Italian city and so on, plus "[Country] live map" pages.
3. **Newsjacking comparison content.** On **9 Oct 2026**, while God's Eye View was trending, it published "ARGOS ATLAS vs God's Eye View", "God's Eye View alternatives", "How to install God's Eye View" and "God's Eye View vs World Monitor". It has similar pages against World Monitor, OSIRIS, WorldCam, Flightradar24, MarineTraffic, EarthCam, SkylineWebcams and "Free Palantir alternatives".
4. **Visual landing page.** Time-lapses of real cameras ("a whole day at the Port of Alicante in 17 seconds, ×5,000") and live counters updated every minute.

**⚠️ It is a direct SEO competitor in our core niche.** It publishes "[DGT Traffic Cameras: 10,894 Live Feeds in Spain](https://argosatlas.com/en/blog/camaras-dgt-guia-completa/)" (Jun 2026) and "Andalusia traffic cameras: 1,246 live", and also covers "Barcelona traffic cameras", "A Coruña", "Canary Islands webcams: 642" and "Operación salida agosto DGT". Our [/camaras](https://trafico.live/camaras) says "**más de 500 cámaras de la DGT**". Our collector ingests only `nap.dgt.es/.../camaras_datex2_v36.xml` (`services/collector/tasks/camera/collector.ts`).

---

## 2. God's Eye View (formerly WorldView): open source, Bilawal Sidhu

Sources: [GitHub](https://github.com/bilawalsidhu/gods-eye-view) · [author's build write-up](https://www.spatialintelligence.ai/p/i-built-a-spy-satellite-simulator) · [Epic Fury replay post](https://x.com/bilawalsidhu/status/2028197571840106985) · [Product Hunt](https://www.producthunt.com/products/god-s-eye-view)

**What it is.** "A spy satellite simulator in your browser, except the data is real."
- **Stack.** A photorealistic 3D globe built with **CesiumJS + Google Photorealistic 3D Tiles** (fallbacks: Esri/OSM/Cesium ion), plus vanilla JS, Vite, GLSL post-processing shaders, SGP4 orbit propagation and hls.js for camera video.
- **Repo stats** (fetched today). **57.9k★, 11.3k forks**, MIT licence, runs locally with Node 24+ or Docker or Pinokio.
- **Origin.** Bilawal Sidhu was a Google PM for 6 years on the 3D Tiles / global 3D mapping effort. He says he built the first version in **a weekend, without hand-writing code**, running "sometimes 8 agents at once" (Gemini, Claude, Codex) from voice notes and screenshots.

**Data layers.**
- Flights: OpenSky plus adsb.lol, including military aircraft and GNSS jamming (GPSJAM).
- Ships: AISStream (key required).
- Satellites: CelesTrak, 838 objects.
- USGS earthquakes, NASA FIRMS fires, NOAA/ECMWF wind.
- About 4,000 CCTV cameras from DOT/city APIs, projected onto the 3D city.
- **Traffic simulated from OSM as particles** (TomTom optional for live speeds).
- GTFS-RT transit, GBFS bikeshare, Mapillary street-level imagery, radio.
- Static datasets: datacentres, dams, submarine cables.

**Standout UX** (this is what went viral):
- Sensor "looks" switched with keys 1–7: **CRT scanlines, NVG night-vision, FLIR thermal (Ironbow), Noir, Snow**, and an anime cel-shade mode.
- Tactical HUD, detection boxes, cockpit view, camera viewsheds.
- **4D timeline replay.** The most viral post was a 24 h minute-by-minute replay of the Iran strikes ("Operation Epic Fury"). He "set an AI agent swarm loose to record every OSINT signal before the caches cleared".
- Voice control via the OpenAI Realtime API (about 30 tools).
- Entity Q&A, an AI HUD summary, and an **MCP server** for Claude/ChatGPT/Codex desktop.
- **Provenance labelled in the UI:** live, delayed, interpolated, estimated, simulated.

**Traction.**
- The README cites "5M+ YouTube views, 25M+ across social".
- #1 GitHub Trending (daily and weekly) in **Aug 2026**, and #8 Product of the Day on Product Hunt.
- Brendan Eich amplified it. Palantir co-founder Joe Lonsdale replied to "defend his company", and the controversy itself spread the post.
- The author's framing: "*Data was never the moat. Accessibility is.*"

**Money.** No direct monetisation. The project builds the author's audience (Spatial Intelligence Substack, paid tier) and funnels into his "SpatialOS" / Halfpixel venture. A hosted version is announced (waitlist at Halfpixel). Argos says it **had not shipped as of 17 Oct 2026**. The README also lists `maptheworld.ai` as the live site, but I couldn't confirm what that serves.

**Self-hosting cost/licensing.**
- Cesium ion is free for **personal, non-commercial** use only (commercial plans from ~US$149/mo, per Argos, not verified).
- Google 3D Tiles are metered.
- OpenAI voice is metered, with $2 warning and $5 cap controls.

### 2b. World Monitor (probably the third globe in reel 2)

[worldmonitor.app](https://www.worldmonitor.app/docs/about) · `koala73/worldmonitor`
- Built by **Elie Habib** (CEO of Anghami). It started as a January 2026 weekend project.
- Free core dashboard with no signup. Pro adds AI briefings and a research assistant. Enterprise, API and MCP are available. **AGPL-3.0**, with a commercial licence offered.
- Claims **2M+ users, ~60k★**, and press in WIRED, The Atlantic and El País.
- Built the same way: one viral post, then themed variants (Tech, Finance, Energy, "Happy").

---

## 3. Reel 3: "map poster of almost any city"

- **The category.** OSM-based minimalist city poster generators. [MapToPoster](https://hellogithub.com/en/repository/originalankur/maptoposter) is a Python CLI with 17 themes, MIT, ~13k★, and it spawned web clones. Variants include MapPoster ($0.99 freemium), Cityograph (free) and PosterMap (an iOS app with a $39.99 lifetime unlock).
- **Why it spreads.** It's personal ("my city"), it's a gift, and it makes a pretty output that people screenshot and share. Making it costs nothing and the output carries its own advertising.
- **Business model.** Freemium hi-res downloads, plus print-on-demand or affiliate sales.
- **Relevance to us.** We already have self-hosted Protomaps/OSM tiles **plus unique data layers nobody else can put on a poster**: IMD traffic intensity per road segment, Cercanías/AVE network shapes, port and ferry routes, radar locations. See idea A7.

---

## 4. What trafico.live can learn

### Context: what we already have vs. them
- **Where we're ahead.** We have far deeper Spain-specific data than all three: DGT incidents, V16 beacons, panels, fuel prices, ~115 live LD trains plus Cercanías GPS, train punctuality, IMD, AIS, an air-quality network, GTFS. We also run 150+ Spanish SEO pages, a public API with Stripe tiers, and an MCP server.
- **Where we're behind.**
  - (1) **Camera breadth.** DGT only, and the copy says "500+".
  - (2) **Nothing "reel-able".** No full-screen showpiece and no replay. Note that `src/components/home/AdvancedFeatures.tsx` advertises "**Globe View 3D — Activo — MapLibre v5 · projection: 'globe'**… edificios 3D", but **I found no `projection: 'globe'` or `fill-extrusion` anywhere in `src/`**. That is a claim/reality gap on the homepage. I also found no pitched 3D runway map on `main`: runways show up as a table on `/aviacion/aeropuertos/[iata]`.
  - (3) **We sell raw data to developers.** Argos and World Monitor sell *watching*: alerts, briefs, history, recording.

### (a) Quick wins on the existing MapLibre/Martin stack

| # | Idea | Maps onto | Effort | Value |
|---|---|---|---|---|
| A1 | **Fix the OpenSky licence exposure** (see §5). Either request a written OpenSky licence or switch `opensky` to **adsb.lol (ODbL 1.0, commercial OK with attribution + share-alike)** as primary source. | `services/collector/tasks/opensky/`, `/api/aviacion`, `/api/v1/vuelos` | S | Risk removal (protects [REV] API tiers) |
| A2 | **Make the homepage claim true or remove it.** Enable MapLibre v5 `projection: {type:'globe'}` at low zoom on the hero map and `/aviacion/mapa` (sky/atmosphere, dark Protomaps), and add 3D buildings via `fill-extrusion` where Protomaps has heights. | `HeroMapDeferred`, `AviationHeroMap`, `map-tiles.ts` | S | Honesty + [EYE] that feeds A4/B2 |
| A3 | **Comparison / alternatives SEO pages, newsjacking-style.** Spanish queries we can win with live embeds: "alternativas a Flightradar24 gratis", "MarineTraffic gratis alternativas", "ver trenes Renfe en tiempo real (vs ADIF/Renfe app)", "cámaras DGT en directo", "God's Eye View en español / sin instalar", "Argos Atlas alternativa España". Argos ships these within 24 h of a trend. We should too. | blog/`noticias`, programmatic SEO | S each | [DIST] (we sit at avg pos 55–65, so this is low-hanging) |
| A4 | **Creator outreach, not just SEO.** Make one full-screen "España en directo" URL (`/directo`): no chrome, dark globe, all trains, planes, ships, incidents and V16 animated, live counters. Pitch it to Spanish-language "webs que debes conocer" creators (Jutex @jutexok 125K, and peers) and to setupsai-type English accounts. Cost: a page + emails. | existing layers + `LiveCounterStrip` | S–M | **[DIST] highest leverage per euro.** A 174K-like reel beats months of 50 impressions/day |
| A5 | **Provenance/freshness badges** on every moving object and card (live · delayed Xs · interpolated · estimated), the way GEV and Argos do. Also mark estimated train positions between GTFS-RT pings. | map cards, `/api/v1` response field | S | Trust for API buyers and AI assistants (12% of sessions) → [REV]/[DIST] |
| A6 | **Smooth interpolation / dead-reckoning** of trains (20 s–2 min pings) and vessels so the map *moves* instead of jumping. Draw estimated segments dashed or grey. | `/api/trenes/posiciones`, `/api/maritimo` | S–M | [EYE] but required for A4/B2 video |
| A7 | **"Tu ciudad / tu red en un póster"**, a lightweight version of reel 3 using *our* layers: IMD traffic-intensity poster per city/province, Cercanías network poster, "España en tren" AVE poster. Free PNG download with a trafico.live watermark/URL. Optional print-on-demand affiliate later. | Protomaps + IMD `TrafficFlow` + railway shapes, server-side render | M | [DIST] (shareable, backlinks, gifts). [REV] small. Only after A1–A5 |
| A8 | **Pitch Argos Atlas (and World Monitor) as *API customers*.** They have shallow Spain data and no V16, incidents, train punctuality or fuel. Argos lists API/MCP at €1,050/mo, so it understands the value of data. One email = revenue before building. | `/api/v1`, MCP | S | **[REV]** |
| A9 | **Copy Argos's copy pattern on the homepage:** "who it's for" profiles (drivers, fleets, journalists, rail fans, maritime) and a "every layer, and when it helps you" table instead of a feature list. | `src/app/page.tsx` sections | S | [DIST]/conversion |

### (b) Bigger bets

| # | Idea | Why / evidence | Effort | Value |
|---|---|---|---|---|
| B1 | **Sell "watching", not just data: trafico.live PRO for drivers, fleets and newsrooms.** Route/corridor **geofences with alerts** (Telegram/e-mail/Slack: incident, V16, closure, DGT panel, train cancellation on my line, port congestion), a **daily brief e-mail**, 7–90 day history (we already have train fleet history mode and per-vessel voyage history in `/maritimo/buques/[slug]/recorrido`), and a corridor **videowall**. | This is exactly what Argos charges €11–67/mo and €1,050/mo for, and what World Monitor's Pro sells. Our existing API tiers serve developers. Fleets and logistics (the sister companies are a warm first customer) and local media need alerts more than raw JSON. | L (start with alerts + brief = M) | **[REV] strongest** |
| B2 | **Event replay engine ("4D replay" of Spanish mobility events).** Scrub minute by minute through operación salida, a DANA, a Renfe meltdown, a storm closing ports, a blackout. Auto-export a 30–60 s MP4/GIF for social and press. | GEV's most viral artefact was a 24 h replay of a news event. Argos's landing leans on ×100/×5,000 time-lapses. We already store time series: incidents, `RailwayDelaySnapshot`, `VesselPosition` (48 h buffer, which would need longer retention for events), `AircraftPosition`. Press *links* to this kind of thing. | M–L | [DIST] (press, links, creators) + [REV] (media licensing, ENTERPRISE) |
| B3 | **Camera parity for Spain (+PT/AD).** Add every public Spanish camera source beyond DGT: SCT/Catalonia, Euskadi/Trafikoa, Madrid city, regional and coastal webcams, Portugal Infraestruturas, Andorra. Build per-road and **per-mountain-pass** camera pages ("puerto de Navacerrada cámara", "estado puertos de montaña") **before the winter season (now)**. | Argos is ranking English content for "DGT cameras" and Spanish regions. Cameras are the emotional hook of its whole product ("Profile 01: drivers and travellers: check your route before you leave"), and that's our core user. | M | [DIST] (seasonal search volume) + ads |
| B4 | **Hosted remote MCP + listing in MCP directories,** priced as an ENTERPRISE add-on. GEV ships an MCP server; Argos gates API+MCP behind €1,050/mo. We already have one (`src/mcp/`, stdio). Add an HTTP transport with API-key auth and usage metering through the existing `ApiUsage`. | AI-assistant referrals are already 12% of sessions. Being the default "Spain mobility" tool inside assistants compounds that. | M | [REV] + [DIST] |
| B5 | **Embeddable widgets** (camera, "incidencias en mi carretera", fuel prices, train delays on a line) for local media and blogs, with a backlink. Argos sells a "Camera API: embed any camera on your site". | Each embed is a backlink and brand impression. It's also a natural upsell to PRO/ENTERPRISE for commercial embeds. | M | [DIST] + [REV] |

### (c) Not worth copying (and why)

| Thing | Why not |
|---|---|
| **Google Photorealistic 3D Tiles / CesiumJS rewrite** | Metered per session. Strict attribution, no pre-fetch/cache/store, no "non-visualization" use ([Google policies](https://developers.google.com/maps/documentation/tile/policies)). Cesium ion is non-commercial on its free tier. This breaks our self-hosted Protomaps/Martin plus edge-cache model and costs scale with virality. Drivers don't need photoreal cities. MapLibre globe + extrusions gets 80% of the wow at 0 marginal cost. |
| **CRT / NVG / FLIR "sensor" shaders, anime mode** | Pure [EYE] for a spy-themed product. At most a hidden "modo reel" CSS/shader toggle if it costs < 1 day. |
| **"Spy on the world" / surveillance framing** | It goes viral, but we are a utility brand whose raw material is DGT/Renfe/AEMET public data and whose buyers are B2B. Surveillance framing invites GDPR complaints and source operators pulling feeds. Use "en directo / antes de salir" instead. |
| **War frontlines, sanctions, billionaire jets/yachts, prediction markets** | Off-brand for Spanish mobility. Tracking named individuals is reputational and privacy risk (GEV explicitly refuses it). Promoting prediction markets is gambling-adjacent in Spain, where gambling advertising is restricted by RD 958/2020. Argos needs these because it has no domain depth. We do have depth. |
| **AI voice control (OpenAI Realtime)** | Gimmick with per-minute cost. Our AI investment is better spent on B4 (MCP) and B1 (AI-written daily brief). |
| **Satellites/ISS, earthquakes, outbreaks, ATC audio** | Off-topic. LiveATC-style audio rebroadcast needs permission. |
| **Copying World Monitor code** | AGPL-3.0: integrating it into trafico.live would force source disclosure. Learn from the UX, don't vendor the code. |
| **Argos-style fake-discount anchoring** ("−80%" off a list price nobody pays) | It works short-term, but EU/Spanish consumer law (the Omnibus directive's price-reduction rule) makes "valued at" anchors risky. And our buyers are B2B. |

---

## 5. Licensing notes

1. **OpenSky: HIGH priority, confidence ≥ 0.8.** The [terms](https://opensky-network.org/about/terms-of-use) license the data "solely for the purpose of non-profit research and non-profit education". They also say: "*Any use by a for-profit or commercial entity requires written permission and a license… Operational use of the REST API in any live product, service, or automated system also requires a written license*". Redistribution is also prohibited. trafico.live (operated by Certus SPV, SLU, with ads and Stripe API tiers) polls `opensky-network.org/api/states/all` every 15 min and re-serves the data via `/api/aviacion` and `/api/v1/vuelos`. **Action:** get a licence, or move to **adsb.lol (ODbL 1.0)**. ODbL allows commercial use with attribution and share-alike on derived *databases* (displayed maps are fine).
2. **aisstream.io.** I couldn't find formal ToS. Confirm the terms before selling AIS data via `/api/v1/buques`.
3. **DGT / regional cameras.** Reuse falls under the Spanish public-sector information regime (Ley 37/2007) with attribution and no alteration of the image. Argos's own posture is: low-res latest frame only, **no history**, takedown address. **Recording or time-lapsing camera images (B2/B3) creates a derived archive.** Check the DGT NAP and each regional portal's licence before storing frames.
4. **Google 3D Tiles / Cesium ion.** See §4(c). Not recommended.
5. **OSM ODbL for posters (A7).** Every print or PNG needs "© OpenStreetMap contributors". MapToPoster itself is MIT. Protomaps basemap data is OSM-derived and carries the same attribution.
6. **God's Eye View.** The code is MIT, but one aggregator says some bundled third-party datasets are CC BY-NC-SA (not verified). Don't lift datasets without checking. **World Monitor** is AGPL-3.0 (see above).

---

## 6. Verified vs. uncertain

**Verified (primary sources fetched today):**
- Reel captions, authors, likes and dates (Instagram og tags); creator follower counts (@jutexok 125K, @setupsai 4M); thumbnails.
- Argos Atlas features, pricing tiers, sources policy, legal notice and blog topics (its own pages via a reader proxy).
- God's Eye View README (57.9k★, MIT, stack, layers, MCP, hosted-version note).
- Bilawal Sidhu's build story and background (his own Substack).
- World Monitor (its own docs).
- OpenSky terms (quoted), Google tile policies, adsb.lol ODbL.
- trafico.live repo facts: DGT-only camera collector, "500+" copy, no globe/extrusion code, MCP stdio, voyage history route.

**Uncertain / not verified:**
- **I could not watch the reel videos** (no audio or transcript). The three projects in reel 2 are inferred from the thumbnail.
- Reel 3's exact poster website is unidentified.
- The Argos operator's identity (undisclosed) and that it is Spanish (inferred from slugs and examples).
- The Argos tech stack (direct connections timed out).
- All Argos counts are self-reported, and its prices are inconsistent across pages.
- The "10,894 Spanish feeds" figure is unverified, and I didn't query our DB for our real camera count.
- The GEV hosted-version status (Argos's claim) and what `maptheworld.ai` serves.
- The Cesium ion US$149/mo figure (from Argos).
- aisstream ToS.
- The DGT camera-archive terms.
