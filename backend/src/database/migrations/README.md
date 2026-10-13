# Migrations — how to run them

Tables are never created automatically. `synchronize` is off on purpose: it
silently alters and drops columns, which in production means lost data. Every
schema change is a file in this folder, reviewed like any other code.

Run from the **repo root** (`Bricks/`). `migration:run` applies only the files
that have not run yet, tracked in the `migrations` table, so running it twice is
safe.

## Local / development

Uses `backend/.env` as it stands.

```bash
pnpm --filter @brics/backend migration:run
```

## Test database

```bash
docker compose -f infra/docker-compose.yml up -d
DATABASE_URL="postgres://brics:brics@localhost:5432/brics_test" DATABASE_SSL=false \
  pnpm --filter @brics/backend migration:run
```

## Production

Use the **direct** connection string (`DATABASE_DIRECT_URL` in
`backend/.env.production`), not the pooled one — a pooled connection cannot run
DDL reliably.

```bash
DATABASE_URL="<direct production URL>" DATABASE_SSL=true \
  pnpm --filter @brics/backend migration:run
```

An inline `DATABASE_URL` wins over `backend/.env`, so this does not touch your
local setup.

**Run this before the new code goes live.** If the order is reversed, new code
runs against the old schema and the errors read like data corruption rather
than a missed step.

On Render this can be automatic: set the service's **Pre-Deploy Command** to
`pnpm --filter @brics/backend migration:run`. It then runs before the new
version serves traffic, and a failed migration stops the deploy. Vercel has no
equivalent hook, so there it stays a manual step.

## Other commands

```bash
# Undo the most recent migration (local only — in production write a new one).
pnpm --filter @brics/backend migration:revert

# Create an empty migration file to write by hand.
pnpm --filter @brics/backend migration:create src/database/migrations/<Name>
```

`migration:generate` is **not** used in this project — see AGENTS.md. Generated
migrations encode whatever the entities happen to say, including changes nobody
intended.

## After a release that adds permissions

Migrations do not reach existing role rows. When a release adds a permission
code, also run:

```bash
pnpm seed
```

It is safe to re-run: it tops up roles and permissions and refuses to create a
second owner.
