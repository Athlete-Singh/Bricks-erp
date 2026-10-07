# 03 — Getting started

## Prerequisites
| Tool | Version | Check |
|---|---|---|
| Node.js | 24 LTS (`.nvmrc`) | `node -v` |
| pnpm | as in root `package.json` → `packageManager` (`corepack enable`) | `pnpm -v` |
| Docker + Compose | recent | `docker compose version` |
| Git | 2.4x+ | `git --version` |
| Flutter | stable (3.x) + Android SDK | `flutter doctor` |

Authoring machine at P0 (2026-10-07): Node 24.12, pnpm 12.4, Docker 29, no Flutter. The build machine must have Flutter.

## First run
```bash
cp .env.example .env              # adjust if needed
pnpm install
docker compose -f infra/docker-compose.yml up -d   # Postgres 16 on :5432
pnpm --filter @brics/backend dev  # http://localhost:4000/api/v1/health, Swagger /api/docs
pnpm --filter @brics/web dev      # http://localhost:3000
```

## Mobile (first time on a machine with Flutter)
The source in `mobile/` was written without the platform folders. Run once:
```bash
cd mobile
flutter create --org com.tvamkey --project-name brics_mobile --platforms=android,ios .
flutter pub get
dart run build_runner build -d
flutter gen-l10n
flutter analyze && flutter test
flutter run   # API URL: --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1 (Android emulator)
```

## Everyday commands
| Task | Command |
|---|---|
| Lint / typecheck / test / build everything | `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` |
| One app | `pnpm --filter @brics/backend test` |
| New migration | `pnpm --filter @brics/backend migration:generate src/database/migrations/Name` |
| Run migrations | `pnpm --filter @brics/backend migration:run` |

## Common errors
- **`ECONNREFUSED 5432`**: Postgres isn't running. Start it with docker compose.
- **Health returns `db: down`**: check `DATABASE_URL` in `.env`.
- **pnpm "ignored build scripts"**: approve them with `pnpm approve-builds`, or add the package to `onlyBuiltDependencies` in `pnpm-workspace.yaml`.
- **Flutter `uri_does_not_exist` for `*.g.dart`**: run `dart run build_runner build -d`.
