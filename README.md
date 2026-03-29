# trafico.live

Real-time traffic intelligence platform for Spain — live incidents, cameras, radars, fuel prices, EV chargers, ZBE zones, and weather alerts from official government sources.

![Build status placeholder](#) ![License: Proprietary](#)

---

## Features

- **Live incidents map** — road incidents and traffic alerts from DGT, updated every 60 seconds
- **DGT cameras** — real-time images from the national road camera network
- **Speed radars** — fixed and mobile radar locations across Spain
- **Fuel prices** — 11,742+ service stations with current prices by fuel type, province, and brand
- **EV chargers** — electric vehicle charging point locations and availability
- **ZBE zones** — low-emission zone boundaries and restrictions by city
- **Weather alerts** — AEMET meteorological warnings affecting road conditions
- **Historical accident data** — accident statistics and trend analysis by road and region
- **Traffic cuts and operations** — planned road works and special traffic operations
- **Environmental labels** — DGT vehicle label lookup
- **Best travel time calculator** — historical congestion patterns by route and hour

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + OKLCH design tokens |
| Database | PostgreSQL via Prisma ORM |
| Cache | Redis |
| Maps | Leaflet (via react-leaflet) |
| Charts | Recharts |
| Data collectors | Node.js services (per data source) |
| Deployment | Coolify on Hetzner |
| DNS/CDN | Cloudflare |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Environment Variables

Create a `.env` file at the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trafico"

# Cache
REDIS_URL="redis://localhost:6379"

# API access (comma-separated keys for rate-limit cycling)
API_KEYS="key1,key2"

# Public
NEXT_PUBLIC_BASE_URL="https://trafico.live"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### Install and Run

```bash
npm install

# Push schema and seed reference data
npm run db:push
npm run db:seed

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build
npm start
```

### Database Scripts

```bash
npm run db:migrate      # Run pending migrations
npm run db:studio       # Open Prisma Studio
npm run import:roads    # Import Spanish road network data
```

---

## Project Structure

```
trafico.live/
├── src/
│   ├── app/                  # Next.js App Router — pages and API routes
│   │   ├── api/              # REST API endpoints (incidents, cameras, fuel, etc.)
│   │   ├── mapa/             # Live map page
│   │   ├── gasolineras/      # Fuel station finder
│   │   ├── camaras/          # DGT camera viewer
│   │   ├── carga-ev/         # EV charger map
│   │   ├── incidencias/      # Incident list and detail
│   │   ├── alertas-meteo/    # Weather alerts
│   │   ├── historico/        # Historical accident data
│   │   └── ...               # Additional route pages
│   ├── components/           # React components
│   │   ├── map/              # Map and layer components
│   │   ├── cameras/          # Camera viewer components
│   │   ├── gas-stations/     # Fuel price components
│   │   ├── incidents/        # Incident list/card components
│   │   ├── charts/           # Data visualisation
│   │   ├── layout/           # Header, footer, navigation
│   │   └── ui/               # Shared UI primitives
│   └── lib/                  # Shared utilities
│       ├── db.ts             # Prisma client singleton
│       ├── redis.ts          # Redis client
│       ├── auth.ts           # API key authentication
│       ├── rate-limit.ts     # Request rate limiting
│       ├── api-utils.ts      # Fetch helpers and retry logic
│       ├── parsers/          # DATEX II, AEMET, and other format parsers
│       └── geo/              # Geospatial utilities and province bounds
├── services/                 # Background data collectors (one per source)
│   ├── incident-collector/   # DGT incidents (DATEX II)
│   ├── camera-collector/     # DGT camera snapshots
│   ├── gas-station-collector/# MINETUR fuel prices
│   ├── charger-collector/    # MITERD EV charger data
│   ├── radar-collector/      # Radar locations
│   ├── weather-collector/    # AEMET alerts
│   ├── panel-collector/      # Variable message signs
│   └── v16-collector/        # DGT V16 emergency beacon data
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Migration history
│   └── seed.ts               # Reference data seed
├── scripts/                  # One-off import and maintenance scripts
├── railway.toml              # Legacy deployment config (kept for reference)
└── next.config.ts            # Next.js configuration
```

---

## Data Sources

| Source | Data | Update frequency |
|--------|------|-----------------|
| **DGT NAP (DATEX II)** | Road incidents, cameras, radars, V16 beacons, variable panels | 60 s |
| **AEMET** | Meteorological warnings and weather conditions | 10 min |
| **MINETUR** | Fuel prices at 11,742+ service stations | 60 min |
| **MITERD** | EV charging point locations and status | 15 min |
| **Euskadi Open Data** | Basque Country traffic and road data | 60 s |
| **SCT Catalunya** | Catalan road network incidents and cameras | 60 s |

All data originates from official Spanish government open-data portals. No third-party traffic data providers are used.

---

## Deployment

The production instance runs on **Coolify** (self-hosted PaaS) on a **Hetzner** dedicated server.

- DNS and CDN managed via **Cloudflare**
- PostgreSQL and Redis run as Coolify-managed services on the same host
- Background collector services run as separate Coolify applications, each connecting to the shared database

A legacy `railway.toml` exists at the project root from the previous Railway deployment (migrated to Coolify).

### Build command

```bash
prisma generate && NODE_OPTIONS='--max-old-space-size=4096' NEXT_WORKER_COUNT=4 next build
```

---

## License

Copyright (c) 2024 abemon ([abemon.es](https://abemon.es)). All rights reserved.

See [LICENSE](./LICENSE) for details. This software is proprietary and not open source. Unauthorised copying, modification, or distribution is prohibited.
