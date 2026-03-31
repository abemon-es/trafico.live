# Contributing

trafico.live is a private project developed by [Abemon](https://abemon.es) for [Certus SPV, SLU](https://trafico.live/aviso-legal). External contributions are not accepted at this time.

This document covers internal development standards.

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or access to the staging DB)
- Redis 7+

### Local Environment

```bash
git clone git@github.com:abemon-es/trafico.live.git
cd trafico.live
npm install
cp .env.example .env   # Fill in DATABASE_URL, REDIS_URL, API_KEYS
npm run db:push
npm run dev
```

### Running Collectors Locally

```bash
cd services/collector
npm install
DATABASE_URL="..." TASK=incident npx tsx index.ts
```

## Branch Conventions

| Prefix | Use |
|--------|-----|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation |
| `refactor/` | Code restructuring |
| `infra/` | Infrastructure changes |
| `blitz/` | Automated blitz sessions |

**Never commit directly to `main`** unless explicitly approved. Create a feature branch, push, and merge.

## Commit Messages

Format: `type: short description`

```
feat: add province-level fuel price comparison
fix: SSE cache key trailing colon
docs: update deployment runbook
refactor: consolidate province lookups to ine-codes.ts
```

All commits must include:
```
Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

## Code Standards

### TypeScript

- Strict mode enabled
- No `any` unless absolutely necessary
- Prefer `interface` over `type` for object shapes

### Styling

- **Tailwind v4 CSS-first** — all tokens in `globals.css`, no config file
- **Brand tokens only** — use `tl-*` / `tl-amber-*`, never raw hex or generic Tailwind colors
- **Fonts** — Exo 2 (headings), DM Sans (body), JetBrains Mono (stats/prices)

### Data

- Numbers displayed numerically (never spelled out)
- Prices in monospace font with 3 decimal places
- Times in 24h format
- Always cite the data source (DGT, AEMET, etc.)

### Security

- No hardcoded secrets — use env vars
- Prisma parameterized queries only (no raw SQL)
- Validate all user input at API boundaries
- See `SECURITY.md` for vulnerability reporting

## API Routes

- Auth: same-origin allowed, external needs `x-api-key` header
- Rate limiting on all endpoints (Redis-backed)
- `days` parameter capped at 90 in all historico routes
- Return JSON with consistent `{ success, data, count }` shape

## Database

- Schema in `prisma/schema.prisma` (960+ lines)
- Always run `npx prisma generate` after schema changes
- Migrations via `npx prisma migrate dev` (local) or `npx prisma migrate deploy` (production)
- Use PgBouncer port (6436) for app/collectors, direct port (5435) for migrations only

## Testing

Build check before pushing:

```bash
npm run build
```

No test suite currently — build verification + manual QA.

## Pull Request Process

1. Create branch from `main`
2. Make changes, verify with `npm run build`
3. Push branch, open PR using the template
4. PR description must include Summary + Test Plan
5. Merge to `main` triggers Coolify auto-deploy

## Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview, setup, ownership |
| `CLAUDE.md` | AI assistant context (stack, conventions, key files) |
| `CHANGELOG.md` | Release history |
| `ROADMAP.md` | Product roadmap and milestones |
| `SECURITY.md` | Security policy and vulnerability reporting |
| `docs/architecture.md` | System design and infrastructure topology |
| `docs/operations.md` | Runbook for deployment, monitoring, incident response |
| `docs/api.md` | API endpoint reference |
| `docs/data-sources.md` | External data sources with URLs, formats, quirks |
| `docs/email.md` | Cloudflare email routing configuration |
