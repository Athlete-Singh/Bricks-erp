# 10 — Testing

| App                   | Tool                       | Command                                 |
| --------------------- | -------------------------- | --------------------------------------- |
| Backend unit          | Jest                       | `pnpm --filter @brics/backend test`     |
| Backend e2e (from P1) | Jest + Supertest + test DB | `pnpm --filter @brics/backend test:e2e` |
| Web                   | Vitest + Testing Library   | `pnpm --filter @brics/web test`         |
| Web e2e (P13)         | Playwright                 | `pnpm --filter @brics/web e2e`          |
| Mobile                | flutter_test + mocktail    | `cd mobile && flutter test`             |

## Must-have tests (no merge without them)

- **Posting:** every posting rule produces Σ Dr = Σ Cr with the right ledgers; reversal mirrors exactly; locked FY rejects.
- **Stock:** Opening + Production + Purchase − Sales − Wastage = Closing; insufficient stock rejected; idempotent replays don't double-move.
- **GST:** CGST+SGST vs IGST, rounding to paise, HSN summary totals.
- **Tenancy:** user of company A can never read or write company B (e2e).
- **Sync:** the same Idempotency-Key twice creates one record.

## Green gate (every session)

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` + `flutter analyze && flutter test`.

## Web e2e (Playwright, P13.1)

These drive a real browser against a **running** web app and API, so they catch
what the component tests cannot: a route that 404s, a screen that offers an
action the server then refuses, a figure that renders a day early because of a
timezone. They do not replace the Jest e2e suite, which proves the books; they
prove the app is usable end to end.

They are **not** part of `pnpm test`, because they need a seeded account and a
password belongs in nobody's repository.

```bash
# 1. a database with a seeded owner, the API, and the web app
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @brics/backend dev     # :4000
pnpm --filter @brics/web dev         # :3000

# 2. the account to sign in as — your own dev owner is fine
export E2E_EMAIL='owner@example.test'
export E2E_PASSWORD='…'

# 3. run
pnpm --filter @brics/web e2e
```

Without `E2E_EMAIL` / `E2E_PASSWORD` the suite **skips** rather than fails, so a
machine that has not been set up does not look broken.

`E2E_BASE_URL` points them at a deployed environment instead of localhost. They
are read-only on purpose — a smoke test that issued invoices would leave a
trail in whatever database it was pointed at, and before go-live that database
is the client's.

Against a dev server the first visit to each route pays for Next's compilation,
which is why the per-test budget is three minutes. Against a production build
the same walk takes seconds.
