# @trafico/mcp-server

MCP server for [trafico.live](https://trafico.live) — Spanish traffic intelligence for AI assistants.

Exposes real-time traffic incidents, fuel prices, railway alerts, weather warnings, and more as tools for Claude Desktop, Cursor, and any MCP-compatible client.

## Installation

```bash
npm install -g @trafico/mcp-server
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "trafico-live": {
      "command": "trafico-mcp",
      "env": {
        "TRAFICO_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor / other MCP clients

```json
{
  "mcpServers": {
    "trafico-live": {
      "command": "npx",
      "args": ["-y", "@trafico/mcp-server"],
      "env": {
        "TRAFICO_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TRAFICO_API_KEY` | API key from trafico.live | (empty — public endpoints only) |
| `TRAFICO_API_URL` | Override base URL | `https://trafico.live` |

Get your API key at [trafico.live/api-docs](https://trafico.live/api-docs).

## Available tools

### Traffic
| Tool | Description |
|------|-------------|
| `get_active_incidents` | Active traffic incidents in Spain — filter by province, severity, or road |
| `get_traffic_intensity` | Real-time Madrid sensor readings with load and service level |
| `predict_congestion` | Congestion forecast for the next 1–24 hours |
| `predict_accident_risk` | Accident risk analysis by road and weather condition |

### Fuel
| Tool | Description |
|------|-------------|
| `get_fuel_prices` | Fuel prices at gas stations — filter by province and fuel type |
| `get_cheapest_fuel` | Top cheapest stations for a given fuel type |
| `get_fuel_trend` | 30-day price trend for a fuel type |
| `predict_fuel_price` | Price forecast for the next 1–30 days |

### Railway
| Tool | Description |
|------|-------------|
| `get_railway_alerts` | Active Renfe service alerts (cancellations, delays, diversions) |
| `get_railway_stations` | Station catalog with location and service types |
| `get_train_fleet` | Renfe rolling stock by brand/service type |

### Weather
| Tool | Description |
|------|-------------|
| `get_weather_alerts` | Active AEMET weather alerts affecting road traffic |
| `get_climate_history` | Historical climate data by province and metric |

### Search & Mobility
| Tool | Description |
|------|-------------|
| `search` | Full-text search across all trafico.live data |
| `get_mobility_flows` | Mobility flows between municipalities or provinces |

## Example usage

Once configured, ask your AI assistant:

- "¿Hay incidencias en la A-1 ahora mismo?"
- "¿Cuál es la gasolinera más barata de Madrid?"
- "¿Hay alertas de Renfe en Cercanías hoy?"
- "¿Qué alertas meteorológicas hay en Galicia?"
- "Busca cámaras de tráfico en la N-340"

## License

MIT — Data sourced from DGT, AEMET, Renfe, and MINETUR.
