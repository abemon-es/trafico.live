# Prisma Proposal — T4 Fleet Models

**Status:** Proposal — awaiting schema merge + migration  
**Owner:** Team 4  
**Depends on:** B1 auth models (User, ApiKey)

---

## New Models

```prisma
model FleetClient {
  id           String   @id @default(cuid())
  name         String
  contactEmail String
  apiKeyId     String   @unique  // FK to ApiKey
  plan         String   // "STARTER" | "PRO" | "ENTERPRISE"
  createdAt    DateTime @default(now())

  apiKey       ApiKey       @relation(fields: [apiKeyId], references: [id])
  vehicles     FleetVehicle[]

  @@index([apiKeyId])
}

model FleetVehicle {
  id            String   @id @default(cuid())
  fleetClientId String
  externalId    String   // client's own vehicle ID
  licensePlate  String?
  label         String?
  status        String   // "ACTIVE" | "INACTIVE"
  createdAt     DateTime @default(now())

  fleetClient  FleetClient    @relation(fields: [fleetClientId], references: [id])
  positions    FleetPosition[]

  @@unique([fleetClientId, externalId])
  @@index([fleetClientId])
}

model FleetPosition {
  id         String   @id @default(cuid())
  vehicleId  String
  lat        Float
  lon        Float
  speed      Float?
  heading    Float?
  recordedAt DateTime
  createdAt  DateTime @default(now())

  vehicle  FleetVehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@index([vehicleId, recordedAt(sort: Desc)])
  @@index([recordedAt(sort: Desc)])
}
```

---

## Migration SQL

```sql
-- FleetClient
CREATE TABLE "FleetClient" (
  "id"           TEXT        NOT NULL PRIMARY KEY,
  "name"         TEXT        NOT NULL,
  "contactEmail" TEXT        NOT NULL,
  "apiKeyId"     TEXT        NOT NULL UNIQUE,
  "plan"         TEXT        NOT NULL DEFAULT 'STARTER',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "FleetClient_apiKeyId_fkey"
    FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE RESTRICT
);

CREATE INDEX "FleetClient_apiKeyId_idx" ON "FleetClient"("apiKeyId");

-- FleetVehicle
CREATE TABLE "FleetVehicle" (
  "id"            TEXT        NOT NULL PRIMARY KEY,
  "fleetClientId" TEXT        NOT NULL,
  "externalId"    TEXT        NOT NULL,
  "licensePlate"  TEXT,
  "label"         TEXT,
  "status"        TEXT        NOT NULL DEFAULT 'ACTIVE',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "FleetVehicle_fleetClientId_fkey"
    FOREIGN KEY ("fleetClientId") REFERENCES "FleetClient"("id") ON DELETE RESTRICT,
  CONSTRAINT "FleetVehicle_fleet_external_uniq"
    UNIQUE ("fleetClientId", "externalId")
);

CREATE INDEX "FleetVehicle_fleetClientId_idx" ON "FleetVehicle"("fleetClientId");

-- FleetPosition (main time-series table)
CREATE TABLE "FleetPosition" (
  "id"         TEXT        NOT NULL,
  "vehicleId"  TEXT        NOT NULL,
  "lat"        DOUBLE PRECISION NOT NULL,
  "lon"        DOUBLE PRECISION NOT NULL,
  "speed"      DOUBLE PRECISION,
  "heading"    DOUBLE PRECISION,
  "recordedAt" TIMESTAMPTZ NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "FleetPosition_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "FleetVehicle"("id") ON DELETE CASCADE
) PARTITION BY RANGE ("recordedAt");

-- Monthly partitions (create 6 months ahead, drop 18 months behind)
-- Example for 2026:
CREATE TABLE "FleetPosition_2026_04" PARTITION OF "FleetPosition"
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE "FleetPosition_2026_05" PARTITION OF "FleetPosition"
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE "FleetPosition_2026_06" PARTITION OF "FleetPosition"
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
-- Add months as needed via cron (see partition management note below)

-- Indexes on each partition (PostgreSQL propagates automatically)
CREATE INDEX "FleetPosition_vehicleId_recordedAt_idx"
  ON "FleetPosition" ("vehicleId", "recordedAt" DESC);
CREATE INDEX "FleetPosition_recordedAt_idx"
  ON "FleetPosition" ("recordedAt" DESC);

-- PostGIS spatial index for geo queries (optional, enable if PostGIS available)
-- ALTER TABLE "FleetPosition" ADD COLUMN geom GEOMETRY(Point, 4326)
--   GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("lon", "lat"), 4326)) STORED;
-- CREATE INDEX "FleetPosition_geom_idx" ON "FleetPosition" USING GIST ("geom");
```

---

## Partitioning Strategy

`FleetPosition` is partitioned **by month** on `recordedAt`. This table is the
highest-volume table in the fleet module — at 1 000 positions/min per fleet,
a fleet of 200 vehicles at 1-min resolution generates ~288 000 rows/day.

**Partition management:**
- Create next 6 monthly partitions via cron (1st of each month, 00:05 UTC)
- Drop partitions older than 18 months (data retention policy)
- Example cron: `5 0 1 * * psql $DATABASE_URL -f /opt/trafico/scripts/fleet-partition-rotate.sql`

**Why not PostGIS yet:**
The initial implementation uses plain `lat`/`lon` DOUBLE PRECISION columns.
The commented `geom` column above can be added as a generated column once
spatial queries (e.g., "vehicles within 5km of a point") are required in a
future sprint.

---

## Relation to Existing Models

- `FleetClient.apiKeyId` → `ApiKey.id` (one-to-one: one fleet per API key)
- `ApiKey` already has `userId` (from B1) — use this to link a logged-in user
  to their fleet: `FleetClient.apiKey.userId === session.user.id`

---

## Isolation Guarantee

Every Prisma query in the fleet API routes MUST include a `fleetClientId`
filter either directly or via a nested `vehicle.fleetClientId` condition.
This is enforced by code review — no query on `FleetPosition` or
`FleetVehicle` may omit this filter in production code.

---

## Index on ApiKey (new field)

The existing `ApiKey` model needs a `fleetClient` back-relation field added:

```prisma
model ApiKey {
  // ... existing fields ...
  fleetClient  FleetClient?  // back-relation, no migration needed
}
```

No migration SQL required for back-relations (Prisma only).
