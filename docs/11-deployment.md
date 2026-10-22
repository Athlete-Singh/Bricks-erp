# 11 — Deployment

| Part     | Host                           | Notes                                                                                                                                                                       |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database | Supabase PostgreSQL            | Daily backups (Supabase), point-in-time restore on paid plan. Connection via pooled `DATABASE_URL` (SSL).                                                                   |
| Backend  | Render (web service)           | Build `pnpm install --frozen-lockfile && pnpm --filter @brics/backend build`; start `node backend/dist/main.js`; pre-deploy `migration:run`; health check `/api/v1/health`. |
| Web      | Vercel                         | Root `web/`; env `NEXT_PUBLIC_API_URL`.                                                                                                                                     |
| Mobile   | Android APK / Play Store (P12) | `flutter build apk --release --dart-define=API_BASE_URL=…`. iOS needs the client's Apple account (excluded fee).                                                            |

## Environments

`local` (docker-compose) → `staging` (preview) → `production`. Variables: `backend/.env.example` (set in Render), `web/.env.example` (set in Vercel), `mobile/env/dev.example.json` (passed at build).

## Backup & restore (ADM-09, P13)

Provider backups + an off-site dump + a monthly restore drill — the runbook, scripts and drill log are in [17-backup-and-restore.md](17-backup-and-restore.md) (`scripts/db/backup.sh`, `scripts/db/restore-drill.sh`).

**What P13.2 needs from the account owner — accounts, plans and every variable — is in [15-go-live-checklist.md](15-go-live-checklist.md).** Nothing in CP1 uploads files, so no object storage is needed; PDFs are generated per request and never stored.
