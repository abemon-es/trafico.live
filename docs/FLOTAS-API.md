# Flotas SaaS — API Reference

Base URL: `https://trafico.live`

## Authentication

All fleet API endpoints require an `x-api-key` header.

```
x-api-key: tl_fleet_<your_key>
```

API keys are scoped to a **FleetClient**. All data is isolated per client —
a key can only read and write data belonging to its own fleet.

### Obtaining an API key

```bash
curl -X POST https://trafico.live/api/keys \
  -H "Content-Type: application/json" \
  -d '{"email": "tu@empresa.es", "name": "Mi flota"}'
```

---

## Rate Limits

| Endpoint group        | Limit                     |
|-----------------------|---------------------------|
| Position ingest       | 1 000 positions / minute  |
| Position reads        | 60 req / minute           |
| Vehicle CRUD          | 120 req / minute          |

Rate limit headers are included on every response:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 750
X-RateLimit-Reset: 42
```

---

## Error Codes

| HTTP | Code                | Description                                      |
|------|---------------------|--------------------------------------------------|
| 400  | `INVALID_BODY`      | Malformed JSON or missing required field         |
| 400  | `VALIDATION_ERROR`  | lat/lon out of range, invalid vehicleId, etc.    |
| 401  | `UNAUTHORIZED`      | Missing or invalid API key                       |
| 404  | `NOT_FOUND`         | Vehicle not found (or not owned by this fleet)   |
| 409  | `CONFLICT`          | Duplicate externalId within fleet                |
| 429  | `RATE_LIMITED`      | Too many requests — see Retry-After header       |
| 500  | `DATABASE_ERROR`    | Internal error — contact support                 |

---

## Endpoints

### POST /api/flotas/positions

Batch-ingest GPS positions for one or more vehicles.

**Request body:**

```json
{
  "positions": [
    {
      "vehicleId": "string (required) — your external vehicle ID",
      "lat": "number (required) — WGS84 latitude [-90, 90]",
      "lon": "number (required) — WGS84 longitude [-180, 180]",
      "speed": "number (optional) — km/h",
      "heading": "number (optional) — degrees [0, 360]",
      "timestamp": "string (optional) — ISO 8601, defaults to now"
    }
  ]
}
```

Maximum 500 positions per request.

**Response (207 Multi-Status):**

```json
{
  "accepted": 2,
  "rejected": [
    { "vehicleId": "van-003", "reason": "Vehicle not found in fleet" }
  ]
}
```

**Example:**

```bash
curl -X POST https://trafico.live/api/flotas/positions \
  -H "Content-Type: application/json" \
  -H "x-api-key: tl_fleet_YOUR_KEY" \
  -d '{
    "positions": [
      { "vehicleId": "van-001", "lat": 40.4168, "lon": -3.7038, "speed": 58.3, "heading": 275 },
      { "vehicleId": "van-002", "lat": 41.3851, "lon": 2.1734, "speed": 0 }
    ]
  }'
```

---

### GET /api/flotas/positions

Retrieve vehicle positions as GeoJSON.

**Query parameters:**

| Parameter   | Type       | Default    | Description                             |
|-------------|------------|------------|-----------------------------------------|
| `since`     | ISO 8601   | -1 hour    | Return positions recorded after this time |
| `vehicleId` | string (repeatable) | all | Filter to specific vehicles           |

**Response (GeoJSON FeatureCollection):**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "clx...",
      "geometry": { "type": "Point", "coordinates": [-3.7038, 40.4168] },
      "properties": {
        "vehicleId": "van-001",
        "label": "Furgoneta Madrid Norte",
        "licensePlate": "1234-ABC",
        "speed": 58.3,
        "heading": 275,
        "recordedAt": "2026-04-17T10:30:00.000Z"
      }
    }
  ]
}
```

Note: coordinates are `[longitude, latitude]` (GeoJSON standard).

**Cache:** 10s `private, max-age=10`.

---

### GET /api/flotas/vehicles

List all active vehicles in the fleet.

**Response:**

```json
{
  "vehicles": [
    {
      "id": "clx...",
      "externalId": "van-001",
      "licensePlate": "1234-ABC",
      "label": "Furgoneta Madrid Norte",
      "status": "ACTIVE",
      "createdAt": "2026-04-01T08:00:00.000Z"
    }
  ]
}
```

---

### POST /api/flotas/vehicles

Register a new vehicle in the fleet.

**Request body:**

```json
{
  "externalId": "string (required) — your internal vehicle ID, unique per fleet",
  "licensePlate": "string (optional)",
  "label": "string (optional) — human-readable name"
}
```

**Response (201):**

```json
{
  "vehicle": {
    "id": "clx...",
    "externalId": "van-001",
    "licensePlate": "1234-ABC",
    "label": "Furgoneta Madrid Norte",
    "status": "ACTIVE",
    "fleetClientId": "clx..."
  }
}
```

Vehicles must be created here before positions can be ingested for them.

---

### GET /api/flotas/vehicles/:id

Get a single vehicle by its internal ID.

**Response (200 or 404):** Same shape as POST response vehicle object.

---

### PATCH /api/flotas/vehicles/:id

Update a vehicle's metadata.

**Request body (all fields optional):**

```json
{
  "label": "string",
  "licensePlate": "string",
  "status": "ACTIVE | INACTIVE"
}
```

---

### DELETE /api/flotas/vehicles/:id

Soft-delete a vehicle (sets status to INACTIVE). Position history is preserved.

**Response:** 204 No Content.

---

## Integration Patterns

### Direct HTTP (any language)

Send a POST to `/api/flotas/positions` with your GPS data. Works from any system that can make HTTP requests.

```python
import requests

resp = requests.post(
    "https://trafico.live/api/flotas/positions",
    headers={"x-api-key": "tl_fleet_YOUR_KEY"},
    json={
        "positions": [
            {"vehicleId": "van-001", "lat": 40.4168, "lon": -3.7038, "speed": 60.0}
        ]
    },
)
print(resp.json())  # {"accepted": 1, "rejected": []}
```

### Batch from telematics device

For devices that buffer positions, send up to 500 per call:

```bash
# Device sends buffered positions every 30 seconds
*/30 * * * * /opt/telematics/flush-positions.sh
```

### Webhook fan-out

If your existing fleet management system supports outbound webhooks, point them to `/api/flotas/positions` with the `x-api-key` header.

### SDK plans

Node.js and Python SDKs are planned for Q3 2026. Subscribe at [flotas@trafico.live](mailto:flotas@trafico.live) to be notified.

---

## Data Isolation

Every API call is isolated to the `FleetClient` linked to your API key.
It is technically impossible to read or write data from another fleet.
Attempts to reference vehicles not in your fleet return 404.

---

## Support

- Email: [flotas@trafico.live](mailto:flotas@trafico.live)
- SLA: See your plan contract
- Status page: [status.trafico.live](https://status.trafico.live)
