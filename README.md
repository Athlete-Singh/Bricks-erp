# BRICS: Brick Chimney ERP & Accounting

ERP + double-entry accounting for brick kiln/chimney businesses, by **TVAM KEY SOFTWARE PRIVATE LIMITED**.
Production → labour & Sardar → inventory → purchases → GST sales → dispatch → transport → cash/bank → books → dashboard and cost per 1,000 bricks. With an offline supervisor app.

| App | Folder | Tech |
|---|---|---|
| API | `backend/` | NestJS · TypeORM · PostgreSQL |
| Owner/admin panel | `web/` | Next.js 14 · Tailwind · TanStack Query |
| Supervisor app | `mobile/` | Flutter · Riverpod · Drift (offline) |

## Quick start
```bash
cp .env.example .env
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @brics/backend dev     # http://localhost:4000/api/v1/health
pnpm --filter @brics/web dev         # http://localhost:3000
```
Mobile and details: [docs/03-getting-started.md](docs/03-getting-started.md).

## Status
What's built and what's left: **[docs/13-roadmap-and-status.md](docs/13-roadmap-and-status.md)** (regenerate with `pnpm status`).

## Docs
Human docs: [docs/](docs/README.md) · AI agents: [AGENTS.md](AGENTS.md) · Client requirements: [docs/client-requirements/](docs/client-requirements/)
