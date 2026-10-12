# M06 Vehicle & Transport

**Purpose:** Own/hired vehicles, drivers, trips, diesel, maintenance, loading/unloading fees, vehicle profitability.
**Phase:** P9 (VEH-01 in P3) · **Status:** ✅ complete (VEH-01 in P3; VEH-02…07 in P9.1b, screens in P9.2)

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| VEH-01 | Vehicles (own/hired; truck/tractor/tipper) and drivers | P3 | ✅ |
| VEH-02 | Trip log: vehicle, driver, route, linked dispatch, freight income | P9 | ✅ |
| VEH-03 | Diesel entries per vehicle/trip | P9 | ✅ |
| VEH-04 | Maintenance/repair expense per vehicle | P9 | ✅ |
| VEH-05 | Loading/unloading fees per trip (linked to labour wages) | P9 | ✅ |
| VEH-06 | Hired vehicle / transporter charges payable | P9 | ✅ |
| VEH-07 | Vehicle-wise profitability report (income − diesel − maintenance − driver/hire cost) | P9 | ✅ |

## Tables
`transport_vehicles`, `transport_drivers` (P3) · `vehicle_trips`, `vehicle_expenses` (P9.1b).
A charge is one of four kinds — diesel, maintenance, loading, hire — each debiting its own ledger.

## Endpoints
- `POST /transport/trips` · `GET /transport/trips` · `GET /transport/trips/:id` — VEH-02
- `POST /transport/expenses` · `GET /transport/expenses` — VEH-03…06
- `GET /transport/vehicle-profitability` — VEH-07
(plus the P3 masters: `/transport/vehicles`, `/transport/drivers`)

## Screens (planned)
Web: vehicles, drivers, trips, diesel, maintenance, vehicle P&L.

## Postings
| Event | Dr | Cr |
|---|---|---|
| Freight charged on a trip | Customer | `FREIGHT_INCOME` |
| Diesel at a pump | `VEHICLE_DIESEL` | Cash / Bank / Party |
| Maintenance | `VEHICLE_REPAIRS` | Cash / Bank / Party |
| Loading fees | `LOADING_UNLOADING` | Cash / Bank / Party |
| Hired vehicle | `FREIGHT_EXPENSE` | Transporter (payable) |

Paid on the spot posts a `payment` voucher; owed posts a `journal`. **Diesel issued from the kiln's own
tank posts nothing** — it was expensed on its purchase bill, so the issue only moves stock (ADR-043).

## Known gaps / notes
- **ADR-042** — freight is income once. A trip against a challan whose invoice already charges transport is
  refused (`FREIGHT_ALREADY_BILLED`). The consequence: VEH-07 reads a vehicle whose work is always billed
  on the invoice as pure cost, which is the honest answer to "what did this vehicle earn as freight".
- Fuel issued from the tank is valued at the amount the user enters, not a computed weighted average —
  stock valuation arrives with closing stock in P10.
- Booking a vehicle charge needs `transport.manage` only, not `accounts.manage` as supplier payments do.
  See OPEN_QUESTIONS #21 for the trade-off.
