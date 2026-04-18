# Prisma PR proposal — T4.10b `StatusIncident`

Target: `prisma/schema.prisma` (owned by T3.6)
Source: T4.10b `/status` page consumes `StatusIncident` when present; falls back to empty array today.

## Model

```prisma
model StatusIncident {
  id          String    @id @default(cuid())
  service     String    // "web" | "api" | "collectors" | "database" | "redis" | "typesense"
  severity    String    // "minor" | "major" | "critical"
  title       String
  description String?
  startedAt   DateTime  @db.Timestamptz
  resolvedAt  DateTime? @db.Timestamptz
  createdAt   DateTime  @default(now()) @db.Timestamptz
  updatedAt   DateTime  @updatedAt @db.Timestamptz

  @@index([service, startedAt])
  @@index([resolvedAt])
  @@map("status_incidents")
}
```

## Migration SQL draft

```sql
CREATE TABLE "status_incidents" (
  "id"          TEXT PRIMARY KEY,
  "service"     TEXT NOT NULL,
  "severity"    TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "startedAt"   TIMESTAMPTZ NOT NULL,
  "resolvedAt"  TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL
);

CREATE INDEX "status_incidents_service_started_idx" ON "status_incidents" ("service", "startedAt");
CREATE INDEX "status_incidents_resolved_idx"      ON "status_incidents" ("resolvedAt");
```

## Usage

- **Written by**: internal ops team + future automation (cron that watches collector failures + web error-rate threshold)
- **Read by**: `/status` page (last 10 incidents), `/api/status/history` (aggregated impact per day)
- **Retention**: indefinite (audit trail)

## Rollback

Dropping the table is safe — `/status` page falls back to empty-state "No hay incidentes recientes" and does not break.
