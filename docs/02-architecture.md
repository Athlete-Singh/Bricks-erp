# 02 — Architecture

```mermaid
flowchart LR
  M[Flutter supervisor app<br/>Drift SQLite + sync queue] -- HTTPS JSON /api/v1 --> A
  W[Next.js 14 web panel<br/>TanStack Query] -- HTTPS JSON /api/v1 --> A
  A[NestJS API<br/>Render] --> D[(PostgreSQL 16<br/>Supabase)]
```

## Backend layers
Controller (validate DTO) → Service (business rules) → Repository (TypeORM, tenant-filtered). Cross-cutting: auth guard, tenant guard, permission guard, response envelope interceptor, error filter, audit subscriber.
Two core engines that every module uses: **StockService** (the only way stock changes) and **PostingService** (the only way journals are written).

## Multi-tenancy
Every business table has `company_id`. The active company comes from the JWT (user picks a company after login). Repositories always add `company_id = :tenant`. Clients never send `company_id`. Kiln access is a second filter (`user_sites`).

## Auth flow
```mermaid
sequenceDiagram
  participant C as Client
  participant A as API
  C->>A: POST /auth/login (email|mobile, password)
  A-->>C: access (15 min) + refresh (30 days, rotating)
  C->>A: requests with Bearer access
  C->>A: POST /auth/refresh when 401
  A-->>C: new pair (old refresh revoked)
```

## Event → stock → accounting
```mermaid
flowchart TD
  E[Business document confirmed<br/>e.g. Sales invoice / Dispatch / GRN] --> T{{One DB transaction}}
  T --> S[StockService.move]
  T --> P[PostingService.post<br/>balanced Dr = Cr]
  T --> L[Audit log]
  S & P & L --> C[Commit, or roll back everything]
```

## Offline sync (summary)
Mobile writes to Drift and enqueues; SyncService pushes with `Idempotency-Key` = record UUID; the server is the authority for stock and accounting. Details: [09-offline-sync.md](09-offline-sync.md).
