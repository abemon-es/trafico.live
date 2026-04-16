# @trafico/mcp-server

[![npm](https://img.shields.io/npm/v/@trafico/mcp-server)](https://www.npmjs.com/package/@trafico/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

MCP server for [trafico.live](https://trafico.live) — real-time Spanish transport intelligence for AI assistants.

Exposes 17 tools covering traffic incidents, fuel prices, railway alerts, weather warnings, maritime vessel tracking, and mobility flows to any [Model Context Protocol](https://modelcontextprotocol.io) client (Claude Desktop, Cursor, Cline, etc.).

Data sources: DGT, AEMET, Renfe/ADIF, MINETUR, CNMC, aisstream.io, Puertos del Estado.

---

## Quick Start

No installation needed:

```bash
npx @trafico/mcp-server
```

Or install globally:

```bash
npm install -g @trafico/mcp-server
trafico-mcp
```

---

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "trafico": {
      "command": "npx",
      "args": ["-y", "@trafico/mcp-server"],
      "env": {
        "TRAFICO_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor / Cline / other MCP clients

```json
{
  "mcpServers": {
    "trafico": {
      "command": "npx",
      "args": ["-y", "@trafico/mcp-server"],
      "env": {
        "TRAFICO_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TRAFICO_API_KEY` | API key from trafico.live (required for premium endpoints) | empty — public endpoints only |
| `TRAFICO_API_URL` | Override base URL | `https://trafico.live` |

Get your API key at [trafico.live/api-docs](https://trafico.live/api-docs).

Public (no key required) endpoints include: active incidents, fuel prices, railway alerts, weather alerts, and search.

---

## Available Tools

### Traffic

| Tool | Description |
|------|-------------|
| `get_active_incidents` | Active road incidents in Spain — filter by province (INE code), severity, or road number |
| `get_traffic_intensity` | Real-time Madrid sensor readings with load %, occupancy %, and service level |
| `predict_congestion` | Congestion forecast for the next 1–24 hours, optionally by province |
| `predict_accident_risk` | Accident risk analysis by road and weather condition |

### Fuel

| Tool | Description |
|------|-------------|
| `get_fuel_prices` | Current prices at gas stations — filter by province and fuel type |
| `get_cheapest_fuel` | Top cheapest stations for a given fuel type |
| `get_fuel_trend` | 30-day price trend and statistics (current, min, max, avg) |
| `predict_fuel_price` | Price forecast for the next 1–30 days |

### Railway

| Tool | Description |
|------|-------------|
| `get_railway_alerts` | Active Renfe service alerts — cancellations, significant delays, diversions |
| `get_railway_stations` | Station catalog (2,154 stations) with location and available service types |
| `get_train_fleet` | Renfe rolling stock info by brand or service type |

### Weather

| Tool | Description |
|------|-------------|
| `get_weather_alerts` | Active AEMET weather alerts affecting traffic — filter by province and severity |
| `get_climate_history` | Historical climate data by province: temperature, precipitation, wind, humidity |

### Maritime

| Tool | Description |
|------|-------------|
| `get_port_activity` | Current vessels near a Spanish port + recent arrivals and departures |
| `get_vessel_voyage_history` | Voyage history for a vessel identified by MMSI |
| `get_recent_voyages` | Recent maritime voyages in Spain — filter by status (IN_TRANSIT/ARRIVED) |

### Search & Mobility

| Tool | Description |
|------|-------------|
| `search` | Full-text search across all trafico.live data (incidents, roads, stations, fuel, weather, articles) |
| `get_mobility_flows` | Daily mobility O-D flows between municipalities or provinces (Ministerio BigData) |

---

## Example Queries

Once configured, ask your AI assistant:

- "¿Hay incidencias en la A-1 ahora mismo?"
- "¿Cuál es la gasolinera más barata de Madrid capital?"
- "¿Hay alertas de Renfe en Cercanías hoy?"
- "¿Qué alertas meteorológicas hay en Galicia esta tarde?"
- "¿Cuántos barcos hay ahora mismo en el puerto de Barcelona?"
- "Dame el historial de viajes del buque con MMSI 224143870"
- "¿Cómo ha evolucionado el precio de la gasolina 95 en los últimos 30 días?"
- "¿Cuáles son los flujos de movilidad entre Madrid y Barcelona?"

---

## License

MIT © [Abemon](https://abemon.es) 2026

Data sourced from DGT, AEMET, Renfe, MINETUR, CNMC, and Puertos del Estado under their respective open data licenses.

---

## Links

- Web: [trafico.live](https://trafico.live)
- API docs: [trafico.live/api-docs](https://trafico.live/api-docs)
- Issues: [github.com/abemon-es/trafico.live/issues](https://github.com/abemon-es/trafico.live/issues)
- Developed by [Abemon](https://abemon.es)
