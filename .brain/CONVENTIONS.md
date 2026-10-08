# CONVENTIONS — all apps

## General
- English identifiers. Files small, single responsibility. No dead / commented-out code. No `any` without a `// reason:` comment.
- Commits: Conventional Commits `type(scope): subject` (feat, fix, refactor, test, docs, chore, ci). Scope = module (`sales`, `brain`, `mobile`).
- Branches: `main` (always green) · `feat/<step>-<short>` · `fix/<short>`.
- Every session: one step, green gate, checkpoint commits, update brain (see AGENTS.md).
- CP1: build only the FEATURES.md depth. Extras → FEATURES "CP2 candidates".

## Naming
| Thing | Rule | Example |
|---|---|---|
| DB tables | snake_case plural | `stock_movements` |
| DB columns | snake_case; FK `<entity>_id`; money `*_amount` | `company_id`, `taxable_amount` |
| TS files | kebab-case | `posting.service.ts` |
| TS classes / types | PascalCase | `PostingService` |
| TS vars / funcs | camelCase | `postJournal()` |
| React components | PascalCase file + export | `DataTable.tsx` |
| Hooks | `use<Thing>` | `useParties()` |
| Dart files | snake_case | `sync_service.dart` |
| Dart classes | PascalCase | `SyncService` |
| API paths | `/api/v1/<plural-kebab>` | `/api/v1/stock-movements` |
| Permission codes | `<module>.<action>` | `sales.invoice.create` |
| Feature IDs | `<PREFIX>-NN` (FEATURES.md) | `SAL-03` |

## Backend (NestJS)
- Module per domain in `src/modules/<module>/`: module, controller, service, `dto/`, `entities/`, `__tests__/`.
- Controllers thin: validate DTO → call service → return. Business logic only in services.
- Cross-module calls only via the other module's exported service. Never import another module's repository/entity to write.
- All entities extend `BaseEntity` (id uuid, timestamps, created_by, updated_by) and `TenantEntity` (+ `company_id`).
- Tenant from the JWT (`@CurrentCompany()`); repositories always filter `company_id`. **Never read `company_id` from the body, query or route param** — company-level routes assert membership via `MembershipService` (**ADR-013**). Covered by `backend/test/tenancy.e2e-spec.ts`; add a cross-tenant refusal test with every new tenant-scoped module.
- Stock changes only via `StockService`; journals only via `PostingService`; both inside the caller's `QueryRunner`/transaction.
- Request bodies validated by `ZodValidationPipe` against the schemas in `@brics/shared` (**ADR-014** — supersedes class-validator, so one schema serves the API and the web forms). Handlers **return the payload raw**; `ResponseEnvelopeInterceptor` wraps it as `{ data }`, or `{ data, meta }` when the service returns `Paginated`. Never return `{ data }` from a handler — that double-wraps. Errors `{ error: { code, message, details? } }` via the global filter; Zod failures are 400 `VALIDATION_FAILED` with `details: [{ field, message }]`.
- List endpoints: `?page=1&limit=25&sort=-created_at&search=&filter[field]=` → `meta: { page, limit, total }`.
- Mobile-used create endpoints accept `Idempotency-Key` header (client UUID); repeat → same result. **Tracked as `SYN-01`, due in P5.1** — the Flutter app is built later, so this is the one thing that must not be deferred with it: retrofitting it means reopening every create endpoint in P5/P6/P7/P9.
- Migrations: `pnpm --filter backend migration:generate src/database/migrations/<Name>`; review SQL; never edit applied ones; no `synchronize`.
- Config only via `ConfigService` typed config; env validated at boot.
- Logging: inject `PinoLogger`; never `console.log`.

## Money & quantities
- DB `NUMERIC(18,2)` (rates `NUMERIC(18,4)` if needed). Code: `decimal.js` (TS) / `decimal` (Dart). Never JS `number` math on money.
- Transport money as **string** in JSON (`"1250.00"`). Brick quantities = integers. Rates = per 1,000 bricks.
- Display: `formatINR()` → `₹1,00,000.00`; dates `DD-MM-YYYY`; FY label `2026-27`.

## Web (Next.js)
- `app/` = routes only. Logic in `features/<feature>/` (`api/`, `hooks/`, `components/`, `schemas/`, `types.ts`).
- No fetch/axios outside `features/*/api` → which use `lib/api-client.ts`. Server state = TanStack Query hooks; UI state = Zustand stores.
- UI only from `components/ui` + `components/shared`. Anything used twice → component. No hard-coded colours/sizes — Tailwind tokens only.
- Forms: React Hook Form + Zod (schemas in `packages/shared` when the backend uses them too). Keyboard: Enter moves to next field, Ctrl+S saves on voucher forms.
- List pages: `PageHeader` + filters bar + `DataTable` — same layout everywhere.
- Query keys: `[feature, 'list', params]`, `[feature, 'detail', id]`; invalidate on mutation success.

## Mobile (Flutter)
- Feature-first: `features/<f>/data | domain | presentation`. Domain kept light.
- Screens never call dio/Drift directly: screen → Riverpod provider → repository → local (Drift) + remote (dio) data source.
- Offline-first: write to Drift + enqueue in `sync_queue` → `SyncService` pushes with `Idempotency-Key` = record UUID; retry with backoff.
- Widgets from `core/widgets` only; no raw `ElevatedButton`/hard-coded colours; theme tokens from `core/theme`. Touch targets ≥ 48dp.
- All user-facing strings in `core/l10n/*.arb` (English now; Hindi-ready).
- Models with freezed + json_serializable; generated files are committed.
- Analyzer: `very_good_analysis`, zero warnings.

## Testing
- Backend: unit tests for every service with logic; **mandatory** for posting, stock, GST calc. e2e against test DB from P1.
- Web: Vitest for utils/hooks/components with logic. Mobile: `flutter_test` + mocktail for repositories/sync.
- Test names describe behaviour: `it('posts balanced journal for GST invoice')`.

## Errors & security
- Throw domain exceptions (`BusinessRuleException(code)`); filter maps to HTTP. Error codes `MODULE_REASON` (`STOCK_INSUFFICIENT`).
- Passwords argon2/bcrypt; JWT access 15 min, refresh 30 days rotating; RBAC guard on every route (`@RequirePermissions()`).
- Secrets only in env; one env file per app — update `backend/.env.example`, `web/.env.example` or `mobile/env/dev.example.json` with every new variable. No root .env.
