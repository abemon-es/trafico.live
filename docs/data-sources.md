# Data Sources

All data originates from official Spanish government open-data portals. No third-party traffic data providers are used.

## DGT NAP (National Access Point)

| Field | Value |
|-------|-------|
| **URL** | `https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml` |
| **Format** | DATEX II XML (v3.6) |
| **Auth** | None (public) |
| **Data** | Road incidents, works, restrictions |
| **Collector** | `TASK=incident` |
| **Schedule** | Every 5 min |
| **Known quirks** | No onset timestamps for some incident types; carriageway descriptions need mapping to direction enum; XML can be >5MB |

## DGT V16 Beacons

| Field | Value |
|-------|-------|
| **URL** | `https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml` |
| **Format** | DATEX II XML (same feed as incidents) |
| **Auth** | None |
| **Data** | Emergency V16 beacon activations |
| **Collector** | `TASK=v16` |
| **Schedule** | Every 5 min |

## DGT Cameras

| Field | Value |
|-------|-------|
| **URL** | `https://nap.dgt.es/datex2/v3/dgt/CCTVPublication/all/content.xml` |
| **Format** | DATEX II XML |
| **Auth** | None |
| **Data** | 1,900+ traffic cameras with image URLs |
| **Collector** | `TASK=camera` |
| **Schedule** | Daily 4am |
| **Known quirks** | Image URLs expire; some cameras are offline but still listed |

## DGT Radars

| Field | Value |
|-------|-------|
| **URL** | `https://nap.dgt.es/datex2/v3/dgt/MeasurementSitePublication/all/content.xml` |
| **Format** | DATEX II XML |
| **Auth** | None |
| **Data** | 730+ fixed speed radar locations |
| **Collector** | `TASK=radar` |
| **Schedule** | Daily 3am |
| **Known quirks** | Speed limits not included in feed — cross-referenced from SpeedLimit table; road number format mismatch (hyphens stripped for matching) |

## DGT Variable Message Panels

| Field | Value |
|-------|-------|
| **URL** | `https://nap.dgt.es/datex2/v3/dgt/VMSPublication/all/content.xml` |
| **Format** | DATEX II XML |
| **Auth** | None |
| **Data** | 2,400+ highway information panels |
| **Collector** | `TASK=panel` |
| **Schedule** | Every 5 min |

## DGT Speed Limits

| Field | Value |
|-------|-------|
| **URL** | `https://nap.dgt.es/datex2/v3/dgt/SpeedManagementPublication/all/content.xml` |
| **Format** | DATEX II XML |
| **Auth** | None |
| **Data** | Speed limit segments by road/km range |
| **Collector** | `TASK=speedlimit` |
| **Schedule** | Weekly (Sunday 3am) |

## SCT (Servei Catala de Transit)

| Field | Value |
|-------|-------|
| **URL** | `https://infocar.dgt.es/datex2/sct/SituationPublication/all/content.xml` |
| **Format** | DATEX II XML |
| **Auth** | None |
| **Data** | Catalan road incidents |
| **Collector** | `TASK=incident` (merged in incident collector) |
| **Schedule** | Every 5 min |

## Euskadi Traffic API

| Field | Value |
|-------|-------|
| **URL** | `https://api.euskadi.eus/traffic/v1.0/incidences` |
| **Format** | JSON (paginated, 20 items/page) |
| **Auth** | None |
| **Data** | Basque Country traffic incidents |
| **Collector** | `TASK=incident` (merged in incident collector) |
| **Schedule** | Every 5 min |
| **Known quirks** | Paginated API — collector fetches up to 50 pages (1000 items); total items can be 300K+ (includes historical) |

## Madrid Informo

| Field | Value |
|-------|-------|
| **URL** | `https://informo.madrid.es/informo/tmadrid/pm.xml` |
| **Format** | Custom XML |
| **Auth** | None |
| **Data** | Madrid traffic flow + incidents (nivel >= 2) |
| **Collector** | `TASK=incident` (merged in incident collector) |
| **Schedule** | Every 5 min |
| **Known quirks** | No onset timestamps — we use first-observation time; ~6,000 traffic points, only 300+ qualify as incidents |

## Valencia OpenDataSoft

| Field | Value |
|-------|-------|
| **URL** | OpenDataSoft API |
| **Format** | JSON |
| **Auth** | None |
| **Data** | Valencia region traffic incidents |
| **Collector** | `TASK=incident` (merged in incident collector) |
| **Schedule** | Every 5 min |
| **Known quirks** | API sometimes returns HTML error pages instead of JSON — collector handles gracefully |

## AEMET OpenData

| Field | Value |
|-------|-------|
| **URL** | `https://opendata.aemet.es/opendata/api/` |
| **Format** | JSON (two-step: first request returns data URL, second fetches data) |
| **Auth** | API key required (`AEMET_API_KEY` env var) |
| **Data** | Weather conditions and meteorological alerts |
| **Collector** | `TASK=weather` |
| **Schedule** | Every 30 min |
| **Known quirks** | API key expires after ~90 days; two-step fetch pattern; register at opendata.aemet.es |

## MINETUR (Ministerio de Industria)

| Field | Value |
|-------|-------|
| **URL** | `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/` |
| **Format** | JSON |
| **Auth** | None |
| **Data** | 12,200+ terrestrial fuel stations with current prices |
| **Collector** | `TASK=gas-station` |
| **Schedule** | 3x daily (6am, 1pm, 8pm) |
| **Known quirks** | Prices use comma as decimal separator; province codes are 2-digit strings; road/km extracted from address field via regex |

## MITERD (Ministerio de Transicion Ecologica)

| Field | Value |
|-------|-------|
| **URL** | Public EV charger registry |
| **Format** | JSON |
| **Auth** | None |
| **Data** | EV charging station locations |
| **Collector** | `TASK=charger` |
| **Schedule** | Daily 6am |
