# M09 Dispatch & Delivery

> Status: **Planned (not started)** · Build phase: P9
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
Dispatch/challan linking invoice, vehicle, driver, grade, loading group; auto stock deduction; delivery acknowledgement.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| DSP-01 | Dispatch / delivery challan: customer, invoice or SO, vehicle, driver, brick type/qty, loading group, loading & delivery location, date/time | P9 | ⬜ |
| DSP-02 | Confirm dispatch → finished stock deducted automatically | P9 | ⬜ |
| DSP-03 | Delivery status + acknowledgement (receiver name, time, remarks) | P9 | ⬜ |
| DSP-04 | Dispatch challan + delivery update on mobile (offline) | P9 | ⬜ |
| DSP-05 | Challan PDF | P9 | ⬜ |

## Data
Planned tables: dispatches, dispatch_items

## Screens
Web: dispatch list/form, challan PDF, delivery status. Mobile: challan + delivery update offline.

## Accounting effect
Quantity only (stock out on confirm). Freight via Transport.

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
