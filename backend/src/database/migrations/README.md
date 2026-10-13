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

Fill in `backend/.env.production` once — connection strings and the first-owner
values — then from the repo root:

```bash
pnpm db:setup:prod
```

That runs the migrations and then the first-run seed against that file. Nothing
to retype, so nothing to mistype: the long inline command this replaces was how
a production job ends up pointed at the wrong database, or seeded with the
development owner's name.

Either half on its own:

```bash
pnpm --filter @brics/backend migration:run:prod
pnpm --filter @brics/backend seed:prod
```

Migrations use `DATABASE_DIRECT_URL` when it is set, because a pooled
connection cannot run DDL reliably. The app keeps using the pooled `DATABASE_URL`.

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
