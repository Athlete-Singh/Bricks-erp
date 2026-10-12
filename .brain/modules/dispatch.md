# M09 Dispatch & Delivery

**Purpose:** Dispatch/challan linking invoice, vehicle, driver, grade, loading group; auto stock deduction; delivery acknowledgement.
**Phase:** P9 · **Status:** ✅ complete (P9.1a backend, P9.2 web)

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| DSP-01 | Dispatch / delivery challan: customer, invoice or SO, vehicle, driver, brick type/qty, loading group, loading & delivery location, date/time | P9 | ✅ |
| DSP-02 | Confirm dispatch → finished stock deducted automatically | P9 | ✅ |
| DSP-03 | Delivery status + acknowledgement (receiver name, time, remarks) | P9 | ✅ |
| DSP-04 | Dispatch challan + delivery update on mobile (offline) | P9 | ⬜ (M5; creates already take `Idempotency-Key`) |
| DSP-05 | Challan PDF | P9 | ✅ |
| LEK-04 | Gate reconciliation — dispatched vs invoiced vs stock, unbilled listed | P9 | ✅ |

## Tables
- `dispatches` — challan header. `challan_no` (CHL-00001, per company, advisory-locked), customer, site,
  optional `sales_invoice_id` / `sales_order_id` / `vehicle_id` / `driver_id` / `loading_group_id`,
  locations, `status`, `moved_stock`, `confirmed_at`, `delivered_on`, `received_by`, `delivery_remarks`,
  `cancel_reason`.
- `dispatch_lines` — one grade out of one yard: `item_id`, `warehouse_id`, `quantity`.
- Also added by this migration: `sales_invoices.dispatch_id` (the other half of the ADR-041 link) and
  `'dispatch'` as a `stock_movements.movement_type`.

## Status machine
`draft → confirmed → delivered`, and `draft → cancelled`.
A confirmed challan is **not** cancellable — undoing it means putting bricks back in the yard, which is a
stock event with its own reason (raise a sales return instead of flipping a status).

## Who moves the stock (ADR-041)
The bricks leave the yard **exactly once**:

| Flow | Link | Who deducts |
|---|---|---|
| Invoice first, then the truck | `dispatches.sales_invoice_id` | the invoice (ADR-038); confirming the challan moves nothing, `moved_stock = false` |
| Truck first, bill later | `sales_invoices.dispatch_id` | the challan on confirm, `moved_stock = true`; the invoice lines point at the challan's stock movements |

Billing more than the challan carried is refused (`INVOICE_EXCEEDS_CHALLAN`). Billing less is allowed —
part-billing is ordinary — and LEK-04 reports it as a quantity mismatch.

## Endpoints
- `POST /dispatches` — DSP-01, `dispatch.manage`, takes `Idempotency-Key`
- `GET /dispatches` — paged, filter by status / customer / vehicle / site / date window
- `GET /dispatches/gate-reconciliation` — LEK-04, `dispatch.view`
- `GET /dispatches/:id` — challan with lines
- `GET /dispatches/:id/pdf` — DSP-05
- `PATCH /dispatches/:id/confirm` — DSP-02, `dispatch.manage`
- `PATCH /dispatches/:id/acknowledge` — DSP-03, **`dispatch.acknowledge`**
- `PATCH /dispatches/:id/cancel` — draft only, reason required

## Permissions
Three codes, not two. `dispatch.manage` opens the gate (and therefore moves stock);
`dispatch.acknowledge` only records who signed for the load. The accountant holds `dispatch.view` alone —
they reconcile the gate (LEK-04) and never open it. The Driver role stays empty in CP1: a driver is master
data (VEH-01), not a user.

## Screens (planned, P9.2)
Web: challan list/form, confirm + acknowledge actions, challan PDF, gate reconciliation report.
Mobile: challan + delivery update offline (M5).

## Postings
Quantity only — no journal. Value enters on the invoice (ACCOUNTING_RULES). Freight income and vehicle
costs are Transport (VEH-02…07, P9.1b).

## Known gaps / notes
- P9.1b still to build: trip log, diesel, maintenance, loading fees, hired-vehicle charges, vehicle P&L.
- A challan cannot be edited after it is raised — correct it by cancelling the draft and raising another.
  Revisit if the field finds that too blunt.
