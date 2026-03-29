# Changelog

> Auto-extracted from Claude Code session history.


> 110 commits, 300 files changed across 15 sessions

## 2026-01-26

- feat(gasolineras): enhanced gas station detail pages  - Add embedded MapLibre GL map to detail pages - Add price comparison vs municipality/province/national averages - Add station ranking display with badges for top performers - Add price history chart to maritime stations (was missing) - Display a
- feat: promote Gasolineras to primary nav, demote Mapa to dropdown  Gasolineras works well but was hidden in "Más" dropdown. Mapa link has issues, so moved to dropdown.
- feat: add API protection with same-origin + API key auth  Protect 43 API endpoints from third-party access while keeping frontend working. Same-origin requests pass through, external requests require X-API-Key header. Health endpoint exempt for monitoring.
- feat: add API protection with same-origin + API key auth  Protect 43 API endpoints from third-party access while keeping frontend working. Same-origin requests pass through, external requests require X-API-Key header. Health endpoint exempt for monitoring.
- fix: sync Prisma to 7.3.0 and replace xlsx with exceljs  - Update @prisma/adapter-pg from 7.2.0 to 7.3.0 - Sync @prisma/client to 7.3.0 across all 9 collectors - Replace vulnerable xlsx package with exceljs (CVE prototype pollution + ReDoS)
- chore: trigger gas-station-collector rebuild
- fix: remove deprecated --skip-generate flag from Prisma db push
- fix: update gas-station-collector for Prisma 7.x compatibility  - Remove deprecated --skip-generate flag from db push - Add prisma.config.ts for Prisma 7.x datasource configuration - Update Dockerfile to copy prisma.config.ts
- fix: add prisma.config.ts to all collector Dockerfiles for Prisma 7.x  Update 7 collectors to copy prisma.config.ts for Prisma 7.x compatibility: - camera-collector - charger-collector - panel-collector - radar-collector - speedlimit-collector - v16-collector - weather-collector
- fix: add noStore() to carreteras pages for dynamic rendering  Ensures database queries are not attempted during static generation.
- feat(gasolineras): add maritime station statistics section  Add dedicated price statistics for maritime fuel stations including: - Average/min/max prices for Gasóleo A, Gasóleo B, and Gasolina 95 - Cheapest maritime stations list with links to detail pages - Maritime-specific styling with blue accen
- fix(gasolineras): show gas stations by default on /gasolineras/mapa  - Add initialLayers prop with gasStations and maritimeStations enabled - Disable all other layers (v16, incidents, weather, highways, etc.) - Update instructions since layer activation is no longer needed
- fix: mark remaining database-dependent pages as dynamic for production build  Pages using Prisma queries need dynamic rendering since the internal database hostname is only accessible at runtime, not during build.  Added dynamic = 'force-dynamic' to: - carreteras category pages (autopistas, autov
- fix: mark remaining database-dependent pages as dynamic for production build  Pages using Prisma queries need dynamic rendering since the internal database hostname is only accessible at runtime, not during build.  Added dynamic = 'force-dynamic' to: - carreteras category pages (autopistas, autov
- feat: add security improvements and health check endpoint  Security improvements: - Add health check endpoint (/api/health) with DB and collector monitoring - Fix error info disclosure in roads/catalog API (remove error.message) - Add input validation for incidents API (whitelist effect/cause/source
- feat: implement rate limiting with Redis  Rate limiting infrastructure: - Add Redis client with connection pooling and error handling (src/lib/redis.ts) - Add rate limiter with 3 tiers: api (100/min), expensive (30/min), strict (10/min) - Add api-utils with IP extraction, CORS, and security
- feat: promote Gasolineras to primary nav, demote Mapa to dropdown  Gasolineras works well but was hidden in "Más" dropdown. Mapa link has issues, so moved to dropdown.
- fix: add noStore() to road category pages for reliable dynamic rendering  Fixes build failure on /carreteras/* pages where Next.js 16 Turbopack was attempting to prerender despite force-dynamic. The unstable_noStore() function reliably opts out of static generation.
- fix(weather-collector): use local Dockerfile with service-level root  Updated weather-collector to match gas-station-collector pattern: - Copy schema.prisma and prisma.config.ts locally - Use relative paths in Dockerfile - Use DOCKERFILE builder in deployment config  Requires service root directo
- chore(weather-collector): force cache bust
- fix(weather-collector): use repo-root paths in Dockerfile  Build system wasn't reading the updated Dockerfile with service-level root. Changed approach: build context is repo root, Dockerfile uses full paths.
- fix(weather-collector): rename Dockerfile to bust build cache
- feat: separate tax-free zones from national fuel price statistics  - Add TAX_FREE_PROVINCES constant (Ceuta, Melilla, Las Palmas, Santa Cruz de Tenerife) - Filter national stats to exclude tax-free zones for fair comparison - Add new "tax-free" scope in aggregator for combined special territories st
- fix: add security headers and restrict CORS origins  - Add comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.) - Replace wildcard CORS with explicit allowed origins whitelist - Update hono to fix JWT algorithm confusion vulnerabilities - Update prisma to 7.3.0
- feat: add fuel price history API endpoint  - Add /api/fuel-prices/history for historical price analysis - Support querying by scope (national, province, community, road) - Support date range up to 365 days - Include period statistics (avg, min, max, change) - Support comparison between two scopes -
- fix: update maritime station interface to match API fields  - Add IDPosteMaritimo, Puerto fields - Fix price field name (Precio Gasoleo A habitual) - Make optional fields properly typed
- fix: allow CartoCDN in CSP for map rendering  Update connect-src to permit cartocdn.com and carto.com for MapLibre tiles. Remove unused events.mapbox.com (Mapbox telemetry).
- fix: add OpenMapTiles fonts and worker-src to CSP  - Add fonts.openmaptiles.org to font-src and connect-src for map labels - Add worker-src for MapLibre web workers - Remove unused Mapbox domains
- feat: Add complete gas stations integration with MINETUR API  - Add Prisma models for GasStation, MaritimeStation, price history and daily stats - Create gas-station-collector service for fetching data from MINETUR API - Add API routes for gas stations, maritime stations, and fuel prices - Create /g
- fix: Update gas station collectors for Prisma 7 adapter and correct API endpoints  - Use PrismaPg adapter in all collectors (collector.ts, maritime.ts, aggregator.ts) - Fix maritime API endpoint: PostesMaritimos/ instead of EstacionesMaritimas/ - Fix maritime field mappings: IDPosteMaritimo, Rótulo,
- fix: Update gas-station-collector for deployment  - Add missing pg and @prisma/adapter-pg dependencies - Update deployment config with correct builder and cronSchedule format - Update Dockerfile to use main project's package.json - Match configuration pattern from working collectors
- fix: Make gas-station-collector self-contained for Coolify  - Copy prisma schema into service directory - Update Dockerfile to use local paths - Update deployment config to use local Dockerfile path - Service can now be deployed standalone with --path-as-root
- fix: Use UTC dates consistently for fuel price stats  Fix timezone mismatch between collector (local time) and server (UTC). All date calculations now use Date.UTC() to ensure consistent date handling: - aggregator.ts: UTC date for daily stats - collector.ts: UTC date for price history - mar
- fix: Add error handling for database queries during build  Pages that query the database now handle errors gracefully during the build phase when the database is not accessible (internal network).  - autopistas/page.tsx: Try-catch around database queries - autovias/page.tsx: Try-catch around
- restore: cron schedule for gas-station-collector  Internal database connection verified working. Restore 3x daily schedule (7:00, 14:00, 21:00 Madrid time).
- feat: complete gasolineras integration with navigation, carreteras, and maps  - Add Gasolineras link to header "Más" dropdown with Fuel icon - Add Gasolineras section to footer with 5 links (5-column layout) - Add gasolineras section to carreteras detail page:   - Fetch gas stations by nearestRoad
- feat: add rate limiting to expensive API endpoints  Apply rate limiting to 10 high-priority routes: - /api/gas-stations/cheapest (strict: 10 req/min) - /api/stats (expensive: 30 req/min) - /api/rankings (expensive: 30 req/min) - /api/historico/* endpoints (expensive: 30 req/min)  This prevents abuse
- fix: increase priceGasoleoB precision for maritime bulk pricing  MINETUR API returns Gasoleo B prices per 1000L for fishing ports (values 548-1059 EUR), exceeding Decimal(5,3) max of 99.999.  Changed MaritimeStation.priceGasoleoB from Decimal(5,3) to Decimal(7,3).
- chore: add prisma migrate deploy to build script  Ensures database migrations run automatically on deploy.
- revert: remove prisma migrate from build (no db access during build)  Will use db push instead for schema sync.
- revert: remove prisma migrate from build  Build environment can't access internal database. Will apply migration manually via db push.
- fix: add schema sync to collector and update schema  - Add prisma db push to collector startup to sync schema - Update collector schema.prisma with priceGasoleoB fix (Decimal 7,3) - Fixes numeric overflow for maritime bulk fuel prices
- fix: normalize maritime Gasoleo B prices to per-liter  MINETUR API reports Gasoleo B for fishing ports in bulk pricing (per 1000L). This normalizes the display to per-liter pricing to match other fuel types.  - API: Divides priceGasoleoB by 1000 if > 10€ - Detail page: Same normalization with (pesqu
- fix: normalize maritime Gasoleo B prices to per-litre  MINETUR API returns Gasoleo B for fishing ports in bulk pricing (per 1000L, e.g., 626€). Now normalized to per-litre (0.626€/L) for consistent display with other fuel types.  - Added parseBulkPrice() function to convert bulk→per-litre - Reverted
- trigger: force collector redeploy
- temp: set collector to run every minute
- chore: restore collector cron schedule and cleanup  - Reverted to 3x daily schedule (7:00, 14:00, 21:00 Madrid) - Removed debug comment from maritime.ts - Normalization code ready for next scheduled run
- feat: add fuel price history API endpoint  - Add /api/fuel-prices/history for historical price analysis - Support querying by scope (national, province, community, road) - Support date range up to 365 days - Include period statistics (avg, min, max, change) - Support comparison between two scopes -
- fix: update maritime station interface to match API fields  - Add IDPosteMaritimo, Puerto fields - Fix price field name (Precio Gasoleo A habitual) - Make optional fields properly typed

## 2026-01-25

- feat: rebrand to Logistics Express (trafico.logisticsexpress.es)  - Update color palette from red to Logistics Express green (#006633, #39a935) - Add Logistics Express branding to header with link to logisticsexpress.es - Update meta tags, OG tags, and author info for new domain - Add middleware for
- feat: add GA4 analytics support with @next/third-parties  - Install @next/third-parties package - Add GoogleAnalytics component to layout (conditional on env var) - Reads NEXT_PUBLIC_GA_MEASUREMENT_ID from environment  To enable: Add NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX in Coolify
- feat: complete Logistics Express rebrand  - Header: replace car icon with Logistics Express logo - Footer: dual branding (abemonFLOW™ Engine + Logistics Express) - /sobre page: dual tech/operator sections with LE contact info - Update User-Agent headers to new domain
- fix: update logo to dark version for white background

## 2026-01-21

- feat: add backup cron service for PostgreSQL  - Daily backups at 3am Madrid time via Coolify cron - Dual destination: Cloudflare R2 + Google Drive - Retention policy: 7 daily + 4 weekly + 3 monthly - Alpine-based Docker image with pg_dump, rclone, python
- fix: use pip for Google API libraries instead of Alpine packages
- fix: show pg_dump errors for debugging
- fix: use PostgreSQL 17 client to match server version  PostgreSQL server is v17.7, need pg_dump v17+ to dump.
- fix: use postgres:17-bookworm image for pg_dump v17 compatibility  PostgreSQL server is v17.7, Alpine only has pg_dump v16. Using official postgres:17 image ensures version match.
- fix: continue to Drive upload even if R2 fails  R2 credentials issue being investigated separately. Backup succeeds if at least one destination works.
- feat: add v16-collector cron service for historical baliza data  - Add lifecycle fields to V16BeaconEvent (firstSeenAt, lastSeenAt, durationSecs) - Create v16-collector Coolify cron service (runs every 5 minutes) - Implement collector.ts: fetches from DGT API, tracks beacon lifecycle - Implement agg
- fix: remove postinstall from v16-collector package.json
- fix: update Prisma version to match main app (7.2.0)
- feat: add root-level Dockerfile for v16-collector
- feat: add /historico page for V16 beacon historical analytics  - Add 4 API endpoints: /api/historico/daily, /hourly, /provinces, /duration - Create historico page with daily trend chart, hourly heatmap, and province rankings - Add duration distribution and statistics visualization - Update navigatio
- feat: add highway GeoJSON layer to map (A1-A7)  - Add public/geojson/highways.json with main Spanish highways - Add highways layer to TrafficMap with colored lines and labels - Add "Autovías" toggle button to map pages (home and /mapa) - Add cyan color option to LayerToggle component
- feat: add interactive provinces layer to map  - Add public/geojson/provinces.json with all 52 Spanish provinces - Add provinces layer to TrafficMap with circles and labels - Add click handler to navigate to province page on click - Add "Provincias" toggle button to map pages
- fix: pass DATABASE_URL explicitly to PrismaClient in v16-collector  Prisma 7.x requires explicit datasource configuration when prisma.config.ts is not present in the working directory.
- chore: add build config to exclude services directory from build
- chore: increase Node memory for build
- chore: add debug flag to build
- chore: limit build workers to 4
- chore: exclude WIP pages from build
- feat: refactor comunidad-autonoma pages for dynamic rendering  - Remove generateStaticParams from all community/province/city pages - Add API routes with force-dynamic for runtime data fetching - Create client content components using SWR for data fetching - Enable /comunidad-autonoma/* routes for p
- feat: add incident-collector for Cataluña and País Vasco  - Create incident-collector service with SCT (DATEX II) and Euskadi (JSON) parsers - Normalize regional incidents to unified TrafficIncident table - Remove exclusion flags for Cataluña (09) and País Vasco (16) - Add Dockerfile.incident-collec
- refactor: move incident-collector Dockerfile to service directory  Aligns with v16-collector pattern for Coolify service detection.
- chore: trigger deployment
- fix: relocate incident-collector Dockerfile to project root  Match v16-collector pattern for Coolify auto-detection.
- feat: serve SCT/Euskadi incidents from database in /api/incidents  Add regional incident data to the unified API endpoint: - Query database for active SCT and Euskadi incidents - Merge with live DGT NAP data in parallel - Map database IncidentType to API effect/cause fields - Gracefully handle parti
- feat: database-first architecture for all API routes  - Add DGT parser to incident-collector (Phase 1) - Serve V16 beacons from database instead of live API (Phase 2) - Serve all incidents from database only (Phase 3) - Serve stats from database with breakdowns (Phase 4) - Add historical accident da
- feat: expand data sources and fix parser gaps  Parser fixes: - dgt-parser: Extract municipality, causeType, detailedCauseType, managementType - sct-parser: Remove incorrect Barcelona province fallback - euskadi-parser: Add pagination support for active incidents  New integrations: - madrid-parser: R
- feat: integrate real-time data into community pages and standardize sources  API updates: - /api/espana: Add activeIncidents, activeV16, incidentsBySource breakdown - /api/comunidad-autonoma/[community]: Add real-time incident counts - /api/incidents: Update comment to include MADRID source  UI upda
- feat: add road-specific speed limits API endpoint  - Add /api/roads/[roadId]/speed-limits endpoint for road-specific speed limit queries - Support filtering by km point, direction, and vehicle type - Include summary with speed limit breakdown by km and provinces - Update explorar/carreteras content
- feat: unified fullscreen map with incident filters  - Create UnifiedMap component with fullscreen support (F key / button) - Add incident filter dropdown in layer toggles (effect + cause filters) - Add map/list view toggle - Simplify homepage and /mapa page using UnifiedMap - Add height prop and inc
- fix: marker click positioning and normalize incident icons  - Add explicit dimensions to marker wrapper div for correct MapLibre anchor calculation - Update EFFECT_ICONS with recognizable Lucide-style paths (ban, gauge, triangle, arrow) - Update CAUSE_ICONS with clearer paths (cone, car, cloud, shie
- feat: add clustering, lifecycle tracking, URL state, and redirects  - Add MapLibre native clustering for incidents and V16 beacons   - Clusters group nearby points at low zoom levels   - Click to expand clusters, individual markers at ≤50 items - Add lifecycle tracking to TrafficIncident schema   -
- feat: add weather alert markers to map  - Render AEMET weather alerts as province-level markers - Group multiple alerts per province with count badge - Color-coded markers by alert type (rain, snow, storm, etc.) - Popup shows all active alerts with severity and description - Load province coordinate
- feat: add map navigation, radars, risk zones, and update data sources  - Remove maxBounds to allow viewing Canary Islands, Ceuta, Melilla - Add location navigation dropdown (Peninsula, Canarias, Ceuta, Melilla) - Add radar layer with DGT radar positions - Add risk zone layer with animal crossing and
- fix: add yellow and amber colors to LayerToggle  Add missing color options for radars and risk zones layers.
- feat: add camera browser page with 500+ DGT traffic cameras  - Add /camaras page with searchable grid of camera thumbnails - Add /api/cameras endpoint parsing DGT DevicePublication XML - Add CameraCard and CameraModal components with auto-refresh - Update map popup to show camera preview with thumbn
- feat: add cameras to community and province pages  - Add province name mapping (DGT format → DB format) - Add community/province filters to /api/cameras - Create reusable CameraSection component - Add camera stats and thumbnails to community pages - Add camera stats and thumbnails to province pages
- fix: use valid RoadType enum values in incident-collector  - Map E-* European routes to AUTOVIA instead of invalid EUROPEA - Map regional roads to PROVINCIAL instead of invalid AUTONOMICA - Use AUTOVIA for A-* roads (was incorrectly using AUTOPISTA) - Remove invalid syntax comment at end of file
- feat: add DGT-style incident categorization and /incidencias page  - Enhanced DATEX2 parser with effect/cause extraction matching DGT categories   - Effects: ROAD_CLOSED, SLOW_TRAFFIC, RESTRICTED, DIVERSION, OTHER_EFFECT   - Causes: ROADWORK, ACCIDENT, WEATHER, RESTRICTION, OTHER_CAUSE - Updated /ap
- feat: add IncidentModal overlay for detailed incident view  - Created IncidentModal component with full incident details - Shows effect type, cause, road info, location, timeline - Opens when clicking map markers or list items - Includes Google Maps link and severity info
- fix: incident map loading and marker behavior  - Fixed /incidencias map not loading (race condition with container) - Added anchor: 'bottom' to markers so they don't jump when clicked - Added IncidentModal to homepage (same behavior as /incidencias) - Map container is now always in DOM, just hidden
- feat: display EV chargers on map from DGT API  - Add DATEX2 parser for DGT EnergyInfrastructure publication - Create /api/chargers endpoint with province/community filters - Add charger data fetching to UnifiedMap via SWR - Render charger markers with green lightning bolt icons - Show popup with pow
- feat: add historical map and analytics to /historico page  - Add /api/historico/map endpoint for beacon locations with severity weights - Add /api/historico/roads endpoint for top roads with km point hotspots - Create HistoricalMap component with heatmap/clusters/points modes - Add severity distribu
- feat: enhance /historico page with V16 info, extended periods, and realtime mode  - Add realtime mode ("Ahora") to view currently active V16 beacons - Extend period selector: hoy, 7d, mes, trimestre, semestre, año, todo - Create V16InfoSection with educational content:   - What is a V16 beacon   - L
- feat: add incident statistics dashboard  - New API endpoint /api/incidents/stats with:   - Totals (total, active, last 24h/7d, avg duration)   - Breakdown by type, cause, source, severity   - Hourly/weekly patterns with heatmap data   - Daily trend, top roads, province rankings  - New page /incidenc
- feat: add comprehensive statistics dashboard with weather, road risk, and correlation analysis  - Consolidate all statistics into unified /estadisticas page with 7 tabs - Add V16-Incident correlation analysis (spatial/temporal proximity) - Add road risk scoring algorithm with CRITICAL/HIGH/MEDIUM/LO
- feat: complete UX reorganization with /explorar section and enhanced dashboard  Phase 3 - /explorar section: - Add layout with 3-tab navigation (Territorios, Carreteras, Infraestructura) - Create Territorios tab migrating from /espana with community listing - Create Carreteras tab with road index by
- fix: remove conflicting route path causing build failure  Remove src/app/api/roads/[road]/speed-limits as it conflicts with existing [roadId] dynamic segment. The /api/roads/speed-limits endpoint already handles speed limit queries.

## 2026-01-20

- Initial commit: Next.js + Prisma setup  - Next.js 14 with App Router and TypeScript - Tailwind CSS for styling - Prisma schema with all models for traffic data - MapLibre, Recharts, SWR dependencies
- feat: Add DATEX II parser, map components, and stats dashboard  - Implement DATEX II XML parser for DGT NAP API - Add Spanish INE codes for provinces/communities - Create interactive TrafficMap with MapLibre GL - Add stats cards, breakdown charts, and time series - Configure layer toggles for V16, i
- fix: Add prisma generate to build process
- feat: Connect real DGT NAP API data to dashboard  Phase 1 - Quick Fixes: - Make repo private - Remove GitHub source link from footer - Update branding with Spanish metadata and SEO  Phase 2 - API Integration: - Create /api/v16 route using existing DATEX II parser - Create /api/incidents route for tr
- fix: update DGT API URLs to correct DATEX v3.6 endpoint  - Changed DGT API URL from /date to /datex2_v36.xml - Updated DATEX II parser to handle v3.6 format:   - Added TPEG location coordinate extraction   - Added Spanish extension parsing (province, municipality, km) - Added province and municipali
- feat: add multi-page structure with navigation  - Add global Header component with responsive navigation - Create /mapa page for full-screen interactive map - Create /provincias page listing all 52 Spanish provinces - Create /provincias/[code] dynamic pages (52 province detail pages) - Create /estad
- feat: add database seeding with Prisma 7 adapter  - Add @prisma/adapter-pg for PostgreSQL connection pooling - Update db.ts to use PrismaPg adapter (Prisma 7.x requirement) - Create prisma/seed.ts with:   - 19 autonomous communities   - 52 provinces with population and area data   - Sample 2023 hist
- feat: Add dgt-import tool for Spain traffic accident data  - Downloads DGT microdatos XLSX files (2021-2023) - Processes individual accident records to aggregated JSON by province - Integrates with trafico-dashboard projects via seed command - Includes skill definition for Claude Code
- docs: Add dgt-import to README
