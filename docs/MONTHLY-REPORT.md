# Monthly Traffic Report

Automated monthly PDF report covering the state of mobility and traffic in Spain.
Published on the 1st of each month at 03:00 CET.

---

## Generation Stack

| Layer | Technology |
|-------|-----------|
| PDF rendering | `@react-pdf/renderer` |
| Storage | Cloudflare R2 (`trafico-reports` bucket) |
| Publishing | Prisma `Article` (`MONTHLY_REPORT` category) |
| Runtime | Node.js 20 (collector image) |

---

## Report Contents

1. **Portada** — trafico.live logo, mes/año, fecha de generación
2. **Índice**
3. **Resumen ejecutivo** — 4 KPIs + párrafo auto-generado desde datos
4. **Incidencias de tráfico** — total + desglose semanal (barras)
5. **Carreteras más afectadas** — top 10 carreteras (barras horizontales)
6. **Meteorología destacada** — alertas AEMET + tabla de eventos extremos
7. **Precios de combustible** — tabla inicio/fin de mes + variación (CNMC)
8. **Puntualidad ferroviaria** — tabla por marca Renfe
9. **Tráfico marítimo** — top 5 puertos por escalas
10. **Tráfico aéreo** — top 5 aeropuertos por vuelos

Footer en todas las páginas: *"Datos de DGT, AEMET, CNMC, Renfe, Eurostat. Generado automáticamente por trafico.live."*

---

## Storage

- **Bucket**: `trafico-reports` (Cloudflare R2, público)
- **Key**: `monthly/YYYY-MM.pdf`
- **Public URL**: `https://reports.trafico.live/monthly/YYYY-MM.pdf`
- **Cache-Control**: `public, max-age=86400`

---

## Required Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL + PgBouncer | — |
| `R2_ACCOUNT_ID` | Cloudflare account ID | — |
| `R2_ACCESS_KEY_ID` | R2 API token access key | — |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret | — |
| `R2_BUCKET` | Target R2 bucket | `trafico-reports` |
| `R2_PUBLIC_BASE_URL` | Public URL prefix | `https://reports.trafico.live` |

---

## Cron Schedule

```
0 3 1 * *   TASK=monthly-report
```

- Runs on the **1st day of every month at 03:00 CET**
- Targets the **previous** calendar month automatically
- Idempotent: checks if `Article` slug already exists before running

---

## Docker Container Allocation

Add to `docker-compose.collectors.yml` under the `daily` service group (or a dedicated
one-shot container):

```yaml
report-monthly:
  image: trafico-collector
  environment:
    TASK: monthly-report
    R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
    R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
    R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
    R2_BUCKET: trafico-reports
    R2_PUBLIC_BASE_URL: https://reports.trafico.live
  mem_limit: 512m
  restart: "no"
```

Crontab (add to `services/collector/crontabs/monthly`):
```
0 3 1 * * TASK=monthly-report node dist/collector/index.js >> /var/log/monthly-report.log 2>&1
```

Memory note: `@react-pdf/renderer` can spike to ~300 MB during PDF render. The 512m
limit provides sufficient headroom for normal reports.

---

## Publishing Flow

```
1. Check idempotency (Article slug exists?) → skip if yes
2. gatherData(year, month) — parallel Prisma queries
3. renderToBuffer(MonthlyReportPDF) — @react-pdf/renderer
4. uploadReport(key, buffer) — R2 upload, 3 retries
5. prisma.article.create — MONTHLY_REPORT, slug=estado-trafico-YYYY-MM
6. [Optional] trigger newsletter highlight via weekly-digest task
```

The upload step is non-blocking: if all 3 retries fail, the error is logged and the
Article is still created with the deterministic public URL (which will return 404 until
a manual re-upload fixes the R2 object).

---

## npm Dependencies (not yet installed)

```bash
npm install @react-pdf/renderer @aws-sdk/client-s3
```

`@aws-sdk/client-s3` may already be available if `@aws-sdk/client-ses` is installed
(same monorepo). Check `package.json` first.

`@react-pdf/renderer` is **only** needed in the collector image. Do **not** add it to
the Next.js web bundle.

---

## Manual Run

```bash
# From repo root
DATABASE_URL="postgres://..." \
  R2_ACCOUNT_ID="abc123" \
  R2_ACCESS_KEY_ID="..." \
  R2_SECRET_ACCESS_KEY="..." \
  npx ts-node services/collector/tasks/monthly-report/index.ts
```

---

## Accessing Published Reports

Published reports are listed at `/ayuntamiento/[slug]/informe` (per municipality context)
and are discoverable via the `/blog` feed (category=MONTHLY_REPORT).

Direct link format: `https://trafico.live/blog/estado-trafico-YYYY-MM`
