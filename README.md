# Trafico Espana (ARCHIVED)

> **Status:** Archived on 2026-02-10. This project is no longer maintained.

Spanish Road Intelligence Platform - Real-time traffic, V16 beacons, cameras, weather, EV charging, ZBE zones.

## Stack

- **Frontend:** Next.js (App Router)
- **Database:** PostgreSQL (Prisma ORM)
- **Hosting:** Railway
- **Data Sources:** DGT, AEMET, MINETUR (gas stations)

## Database Backup

A full PostgreSQL dump was taken before archiving:

- **Date:** 2026-02-10
- **File:** `trafico-espana-db-backup-2026-02-10.sql.gz` (11 MB compressed, 63 MB uncompressed)
- **Location:** Google Drive Secrets folder
- **Drive Link:** https://drive.google.com/file/d/19onXXWPBrgwAqeCUwpuiyEBH7iZIvunH
- **DB Version:** PostgreSQL 17.7
- **Schema:** See `prisma/schema.prisma` for full data model

### Restore

```bash
gunzip -c trafico-espana-db-backup-2026-02-10.sql.gz | psql <connection_string>
```

## Railway Project

- **Project ID:** `8eb51698-b01b-4209-9b0b-18bef3b4db3d`
- **Services:** web, Postgres, weather-collector, incident-collector, gas-station-collector, v16-collector
- **Domain:** trafico.logisticsexpress.es (decommissioned)
