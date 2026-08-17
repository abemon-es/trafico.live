-- CreateTable: derived flight history per airframe (see schema.prisma Flight)
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "icao24" TEXT NOT NULL,
    "callsign" TEXT,
    "firstSeenAt" TIMESTAMPTZ NOT NULL,
    "lastSeenAt" TIMESTAMPTZ NOT NULL,
    "originAirportId" TEXT,
    "destAirportId" TEXT,
    "maxAltitude" INTEGER,
    "positionsCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Flight_icao24_firstSeenAt_key" ON "Flight"("icao24", "firstSeenAt");
CREATE INDEX "Flight_icao24_lastSeenAt_idx" ON "Flight"("icao24", "lastSeenAt" DESC);
CREATE INDEX "Flight_isActive_idx" ON "Flight"("isActive");
CREATE INDEX "Flight_originAirportId_idx" ON "Flight"("originAirportId");
CREATE INDEX "Flight_destAirportId_idx" ON "Flight"("destAirportId");

ALTER TABLE "Flight" ADD CONSTRAINT "Flight_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_destAirportId_fkey" FOREIGN KEY ("destAirportId") REFERENCES "Airport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
