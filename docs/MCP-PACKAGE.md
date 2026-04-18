# @trafico/mcp-server — packaging strategy

## Why HTTP, not Prisma

The published npm package talks to `https://trafico.live/api` over HTTPS using an API key. It does **not** depend on Prisma or database credentials. End-users (Claude Desktop, Cursor, Continue.dev, Cline) install once and authenticate with the key they got from `/api-landing`.

The original in-repo `src/mcp/` keeps running against Prisma for internal use. Both can drift independently; keeping them separate avoids shipping DB access.

## Releasing a new version

1. Bump `version` in `packages/mcp-server/package.json`
2. Commit: `chore(mcp): release vX.Y.Z`
3. Tag: `git tag mcp-vX.Y.Z && git push origin mcp-vX.Y.Z`
4. GitHub Actions workflow `mcp-release.yml` publishes to npm with provenance and creates a GitHub release with auto-changelog.

## Required secrets

- `NPM_TOKEN` — GitHub Actions secret, automation token from `npmjs.com/settings/your-username/tokens`
- `GITHUB_TOKEN` — provided automatically by Actions

## Discord community

Goal: 200 members S5. Channels: `#api-users`, `#mcp-questions`, `#showcase`, `#announcements`. Owner: T4.4 launches server in S3, invite goes on `/api-landing` after first stable release.

## Future roadmap

- **v1.1** SSE transport alongside stdio (enables remote hosting of the MCP server)
- **v1.2** Tool catalog parity with internal `src/mcp/` (cameras, IMD, railway punctuality)
- **v2.0** Event subscriptions (push notifications on matching events)

## Monorepo upgrade path

Root `package.json` does **not** declare `workspaces` today — the package builds standalone via `cd packages/mcp-server && npm ci && npm run build`. If we move to Turborepo, add:

```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "build:mcp": "npm run build -w @trafico/mcp-server"
  }
}
```
