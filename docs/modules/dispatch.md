# M09 Dispatch & Delivery

> Status: **Built** · Build phase: P9
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose

Dispatch/challan linking invoice, vehicle, driver, grade, loading group; auto stock deduction; delivery acknowledgement.

## Planned scope (MVP depth)

| ID     | Feature                                                                                                                                      | Phase | Status |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| DSP-01 | Dispatch / delivery challan: customer, invoice or SO, vehicle, driver, brick type/qty, loading group, loading & delivery location, date/time | P9    | ✅  |
| DSP-02 | Confirm dispatch → finished stock deducted automatically                                                                                     | P9    | ✅  |
| DSP-03 | Delivery status + acknowledgement (receiver name, time, remarks)                                                                             | P9    | ✅  |
| DSP-04 | Dispatch challan + delivery update on mobile (offline)                                                                                       | P9    | ⬜     |
| DSP-05 | Challan PDF                                                                                                                                  | P9    | ✅  |

## Data

Tables: dispatches, dispatch_lines (+ `sales_invoices.dispatch_id`, the other half of the ADR-041 link)

## Screens

Web: dispatch list/form, challan PDF, delivery status. Mobile: challan + delivery update offline.

## Accounting effect

Quantity only (stock out on confirm). Freight via Transport.

## How it works

A challan is raised as a **draft**, confirmed when the truck actually leaves the gate, and signed for when
the customer receives it. Confirming is the moment stock moves — not raising the paperwork.

The bricks leave the yard **exactly once**. A kiln bills either way round, so both are supported:

- **Invoice first, then the truck.** The invoice already deducted the stock, so confirming the challan
  moves nothing. The challan names the invoice.
- **Truck first, bill later.** The challan deducts the stock on confirm. The invoice raised against it
  bills what already moved and does not deduct again.

Billing more than the truck carried is refused. Billing less is allowed — part-billing is ordinary — and
the gate reconciliation report flags it.

**Gate reconciliation (LEK-04)** answers one question: _did every truck that left the gate get billed?_
For a date window it lists each confirmed challan with three numbers — what left, what was invoiced, and
what the stock ledger recorded — and counts the ones with no bill at all.

Opening the gate and signing for a load are separate permissions. The accountant who reconciles the gate
cannot open it.

## How to test

1. Raise a challan for a customer with a grade and a yard, and confirm it. Current stock drops by that
   quantity; the stock register shows a `dispatch` movement.
2. Raise a sales invoice against that challan. Stock does **not** drop again; the invoice shows the
   challan on it.
3. Open the gate reconciliation for that date: the challan is listed as billed, with matching quantities.
4. Confirm another challan and leave it unbilled — it appears in the same report with "unbilled" set and
   is counted in the summary.
