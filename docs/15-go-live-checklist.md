# 15 — What P13.2 needs from you (go-live checklist)

Everything below is something only the account owner can do: create an account,
accept terms, or generate a secret. None of it can be done from the repository,
which is why P13.2 waits on this list.

Nothing here needs file or image storage. **BRICS uploads no files in CP1** —
the invoice and challan PDFs are generated on the fly and streamed to the
browser, never stored, and photo/signature proof of delivery is a CP2
candidate, not part of this release. If that changes, storage gets added then.

---

## 1. Database — Supabase

Create one project. Region: **Mumbai (ap-south-1)** — every user is in India and
the latency shows on every screen.

What to send:

| Item                                          | Where it is in Supabase                                                             | Goes to                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------- |
| **Pooled connection string** (`DATABASE_URL`) | Project Settings → Database → Connection string → **Transaction pooler**, port 6543 | Render → `DATABASE_URL`          |
| **Direct connection string**                  | Same page → **Direct connection**, port 5432                                        | Used once, to run migrations     |
| Database password                             | Set when you create the project                                                     | Keep — it is inside both strings |

Both strings contain the password, so send them the way you would send a
password, not in a chat that stays searchable.

On the plan: **daily backups need the Pro plan**. The free plan has no
scheduled backups, which means a bad day costs the whole database. ADM-09 is in
the SOW, so this is not optional — ₹ roughly $25/month.

## 2. Backend API — Render

Create an account (GitHub login is fine) and a **Web Service** pointed at this
repository. Region **Singapore** is Render's closest to India.

What to send: nothing, if you add me to the service. Otherwise the service URL
once it exists (e.g. `https://brics-api.onrender.com`) — the web app needs it.

Plan: the free tier **sleeps after 15 minutes idle**, so the first person to
open BRICS each morning waits ~50 seconds for a cold start, and a kiln with one
morning shift will hit that every single day. Starter is $7/month.

These go into Render → Environment. Generate the two secrets yourself:

| Variable             | Value                                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | `production` — this is also what closes the API docs                                                                                                                 |
| `DATABASE_URL`       | Supabase **pooled** string from §1                                                                                                                                   |
| `DATABASE_SSL`       | `true`                                                                                                                                                               |
| `CORS_ORIGINS`       | the real web origin, e.g. `https://brics.yourdomain.com`. **Never `*`** — that hands every site on the internet the ability to call the API with your user's browser |
| `JWT_ACCESS_SECRET`  | fresh random, ≥32 chars: `openssl rand -base64 48`                                                                                                                   |
| `JWT_REFRESH_SECRET` | a **different** fresh random, ≥32 chars                                                                                                                              |
| `JWT_ACCESS_TTL`     | `15m`                                                                                                                                                                |
| `JWT_REFRESH_TTL`    | `30d`                                                                                                                                                                |
| `LOG_LEVEL`          | `info`                                                                                                                                                               |
| `PORT`               | Render sets this itself — do not add it                                                                                                                              |

The first deploy also needs the **first owner account**, created once by
`pnpm seed` and then never again (it refuses to run if any user exists):

| Variable                  | Value                                                 |
| ------------------------- | ----------------------------------------------------- |
| `SEED_COMPANY_NAME`       | the real company name as it should appear on invoices |
| `SEED_COMPANY_STATE_CODE` | GST state code — `09` for Uttar Pradesh               |
| `SEED_OWNER_NAME`         | the owner's name                                      |
| `SEED_OWNER_MOBILE`       | the owner's mobile                                    |
| `SEED_OWNER_EMAIL`        | the owner's email                                     |
| `SEED_OWNER_PASSWORD`     | a strong password the owner changes at first login    |

Remove the four `SEED_OWNER_*` values from Render after the first deploy. They
are of no further use and a password sitting in a dashboard is a password that
leaks.

## 2b. If the API runs on Vercel instead of Render

It works, and three things change — one of them undoes a fix made in P13.1, so
it is not a free swap.

1. **Rate limiting stops being worth much.** The throttler counts attempts in
   the instance's own memory. A long-lived server has one memory; a function
   host starts a fresh instance per burst, each with its own counter, so "ten
   login attempts a minute" quietly becomes ten _per instance_. Getting the
   limit back means a shared counter — Upstash Redis is the usual answer, free
   tier adequate — which is one more account and one more credential
   (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Without it, the
   login limit is decoration.
2. **Migrations have no pre-deploy hook.** Render runs them before the new code
   serves traffic; on Vercel they have to be run by hand from a machine with
   the **direct** connection string, before promoting the deployment. Worth a
   written step in the release routine, because a deploy that serves new code
   against an old schema fails in ways that look like data corruption.
3. **Connections have to be rationed.** Set `DB_POOL_MAX=1` and point
   `DATABASE_URL` at Supabase's **transaction pooler**. Fifty instances holding
   ten connections each will exhaust the database while the app still looks
   idle.

Also worth knowing: a function times out (10s on Hobby, 60s on Pro) and Nest
boots the whole application on every cold start, so the first request after an
idle spell is slow and a long report — a year-end close, cost-per-1,000 across
a wide window — can hit the ceiling. Neither is fatal; both are the kind of
thing that is better known before the client finds it.

The recommendation stands as Render for the API, because today it costs $7 and
no extra moving parts. If Vercel is already running it, the first thing to add
is the shared rate-limit store.

## 3. Web app — Vercel

Create an account and a project with **root directory `web/`**.

| Variable              | Value                                          |
| --------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://<render-service>.onrender.com/api/v1` |

`NEXT_PUBLIC_*` is baked into the browser bundle, so nothing secret ever goes
here. The free Hobby plan is fine for one company; a client-facing commercial
deployment is meant to be on Pro ($20/month) under Vercel's own terms.

## 4. Domain (optional, recommended)

If BRICS should live at `brics.yourdomain.com` rather than a vercel.app
address, you need the domain and access to its DNS. The API can stay on its
Render address or get `api.yourdomain.com`; either way `CORS_ORIGINS` must name
the web origin exactly.

## 5. Not needed for CP1

- **File/object storage** — nothing is uploaded. See the note at the top.
- **Email provider** — BRICS sends no email. Password reset in CP1 is done by
  an administrator, not by a link in an inbox.
- **SMS / WhatsApp (MSG91 or Twilio)** — NTF-01 is still an open question
  (OPEN_QUESTIONS #14). If you decide it is in scope, that account and its API
  key are the only extra credentials it needs.
- **Payment gateway** — BRICS records payments, it does not take them.

---

## What happens after you send these

1. Migrations run against the Supabase database (once, with the **direct**
   connection string).
2. `pnpm seed` creates the chart of accounts, the roles and the first owner.
3. The API goes up on Render, the web app on Vercel, with `CORS_ORIGINS`
   pointing at the real web origin.
4. **A restore is tested, not assumed** — a backup is restored into a scratch
   project and the smoke tests run against it. "Backups are enabled" is not the
   same claim as "we can get the data back", and the difference only ever shows
   up on the worst day. ADM-09 is not done until this has been done once.
5. The Playwright core-flow suite runs against the deployed URL
   (`E2E_BASE_URL`), read-only.

## Re-deploy checklist (every release, not just the first)

- Run migrations **before** the new code serves traffic.
- Re-run `pnpm seed` when a release adds permission codes. Migrations do not
  reach existing role rows, and a permission nobody holds looks exactly like a
  missing feature — this has already bitten us once in P9.
- Check `CORS_ORIGINS` still names every origin the web app is served from.
