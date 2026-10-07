# 07 — API

Base URL `/api/v1`. Swagger UI at `/api/docs` (always current). The endpoint list is in [`.brain/API_INDEX.md`](../.brain/API_INDEX.md).

## Conventions
- REST, plural kebab-case resources: `/parties`, `/sales-invoices/:id/confirm` (actions as sub-resources with POST).
- Auth: `Authorization: Bearer <access>`; refresh at `POST /auth/refresh`.
- Tenant: from the token, never from the request.
- Money as strings (`"1250.00"`); dates ISO `YYYY-MM-DD`; timestamps ISO UTC.
- Mobile creates: header `Idempotency-Key: <uuid>`. Repeating it returns the original result.

## Response envelope
```json
{ "data": { "id": "…" } }
{ "data": [ … ], "meta": { "page": 1, "limit": 25, "total": 240 } }
```

## Errors
```json
{ "error": { "code": "STOCK_INSUFFICIENT", "message": "Only 12,000 Class-1 bricks in stock", "details": { … } } }
```
400 validation (`VALIDATION_FAILED`, details per field) · 401 unauthenticated · 403 no permission · 404 not found · 409 conflict / duplicate · 422 business rule · 500 unexpected (logged with request id).

## Lists
`?page=1&limit=25&sort=-date,number&search=ram&filter[status]=posted&filter[from]=2026-04-01`
