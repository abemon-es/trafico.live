# Prisma Schema Proposal — T4 Alerts & Affiliates

> Maintainer: T4 · Status: Proposal (pending T1/schema-owner review)
> These models must be merged into `prisma/schema.prisma` by T1 before the
> alert API routes will actually persist data.

## New Models

```prisma
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

enum AlertType {
  ROAD
  TRAIN
  FLIGHT
}

enum AlertChannel {
  PUSH
  EMAIL
  TELEGRAM
}

enum AlertFrequency {
  REAL_TIME
  DAILY
  WEEKLY
}

enum AlertStatus {
  ACTIVE
  PAUSED
  DELETED
}

// ---------------------------------------------------------------------------
// UserAlert — one row per user-defined alert
// ---------------------------------------------------------------------------

model UserAlert {
  id              String         @id @default(cuid())
  userId          String
  type            AlertType
  /// Machine-readable target: "road:A-6" | "train:cercanias-c1-madrid" | "flight:IB6250"
  targetKey       String
  /// Human-readable label shown in the UI
  targetLabel     String
  channels        AlertChannel[]
  frequency       AlertFrequency @default(REAL_TIME)
  status          AlertStatus    @default(ACTIVE)
  createdAt       DateTime       @default(now())
  lastTriggeredAt DateTime?

  @@index([userId, status])
  @@index([type, targetKey, status])
}

// ---------------------------------------------------------------------------
// PushSubscription — one row per browser/device
// ---------------------------------------------------------------------------

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  /// Web Push endpoint URL (unique per device)
  endpoint  String   @unique
  /// ECDH public key (p256dh) from PushSubscription
  p256dh    String
  /// Authentication secret from PushSubscription
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
}

// ---------------------------------------------------------------------------
// AffiliateOffer — product/offer catalog for affiliate links
// ---------------------------------------------------------------------------

model AffiliateOffer {
  id       String   @id @default(cuid())
  /// "skyscanner" | "trainline" | "directferries" | "flixbus" | "awin" | "rakuten"
  partner  String
  /// Optional route key for contextual matching, e.g. "madrid-bcn"
  routeKey String?
  product  String?
  priceEur Decimal?
  deepLink String
  active   Boolean  @default(true)

  clicks AffiliateClick[]

  @@index([partner, routeKey])
}

// ---------------------------------------------------------------------------
// AffiliateClick — one row per tracked outbound affiliate click
// ---------------------------------------------------------------------------

model AffiliateClick {
  id           String    @id @default(cuid())
  offerId      String
  userId       String?
  sessionId    String?
  /// Page path that generated the click (for attribution analysis)
  referrerPath String
  /// Unique sub-ID sent to affiliate network for conversion matching
  subId        String    @unique
  conversion   Boolean   @default(false)
  convertedEur Decimal?
  convertedAt  DateTime?
  createdAt    DateTime  @default(now())

  offer AffiliateOffer @relation(fields: [offerId], references: [id])

  @@index([offerId, createdAt])
  @@index([conversion])
}
```

---

## Migration SQL

```sql
-- AlertType enum
CREATE TYPE "AlertType" AS ENUM ('ROAD', 'TRAIN', 'FLIGHT');

-- AlertChannel enum
CREATE TYPE "AlertChannel" AS ENUM ('PUSH', 'EMAIL', 'TELEGRAM');

-- AlertFrequency enum
CREATE TYPE "AlertFrequency" AS ENUM ('REAL_TIME', 'DAILY', 'WEEKLY');

-- AlertStatus enum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DELETED');

-- UserAlert table
CREATE TABLE "UserAlert" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"          TEXT NOT NULL,
  "type"            "AlertType" NOT NULL,
  "targetKey"       TEXT NOT NULL,
  "targetLabel"     TEXT NOT NULL,
  "channels"        "AlertChannel"[] NOT NULL DEFAULT '{}',
  "frequency"       "AlertFrequency" NOT NULL DEFAULT 'REAL_TIME',
  "status"          "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastTriggeredAt" TIMESTAMPTZ,
  CONSTRAINT "UserAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserAlert_userId_status_idx" ON "UserAlert" ("userId", "status");
CREATE INDEX "UserAlert_type_targetKey_status_idx" ON "UserAlert" ("type", "targetKey", "status");

-- PushSubscription table
CREATE TABLE "PushSubscription" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint")
);

CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription" ("userId");

-- AffiliateOffer table
CREATE TABLE "AffiliateOffer" (
  "id"       TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partner"  TEXT NOT NULL,
  "routeKey" TEXT,
  "product"  TEXT,
  "priceEur" DECIMAL,
  "deepLink" TEXT NOT NULL,
  "active"   BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "AffiliateOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AffiliateOffer_partner_routeKey_idx" ON "AffiliateOffer" ("partner", "routeKey");

-- AffiliateClick table
CREATE TABLE "AffiliateClick" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "offerId"      TEXT NOT NULL,
  "userId"       TEXT,
  "sessionId"    TEXT,
  "referrerPath" TEXT NOT NULL,
  "subId"        TEXT NOT NULL,
  "conversion"   BOOLEAN NOT NULL DEFAULT false,
  "convertedEur" DECIMAL,
  "convertedAt"  TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AffiliateClick_subId_key" UNIQUE ("subId"),
  CONSTRAINT "AffiliateClick_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "AffiliateOffer" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AffiliateClick_offerId_createdAt_idx" ON "AffiliateClick" ("offerId", "createdAt");
CREATE INDEX "AffiliateClick_conversion_idx" ON "AffiliateClick" ("conversion");
```

---

## Notes

1. `UserAlert.channels` uses a PostgreSQL array (`AlertChannel[]`) — supported by Prisma 7 with `@db.Array` semantics. Verify Prisma adapter supports array enums before merging.
2. `UserAlert.userId` is a plain `String` — links to the `User` model (or `ApiKey.id` for API-key-based callers). Once B1's User model is final, add explicit `@relation`.
3. `AffiliateOffer` rows are seeded manually or via `npm run db:seed` — no collector needed.
4. `AffiliateClick.subId` must be generated server-side (e.g. `cuid()`) and appended to affiliate deep links as a query param for conversion attribution.
5. Admin access currently guarded by `ADMIN_EMAILS` env var — upgrade to `User.role === ADMIN` in S4 (propose to T3.6 to add role field).
