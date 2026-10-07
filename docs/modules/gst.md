# M11 GST Engine

> Status: **Planned (not started)** · Build phase: P3, P7, P8, P10
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
HSN/rate config, CGST/SGST vs IGST, input GST, GSTR-1 and GSTR-3B registers, GST reports.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| GST-01 | HSN/SAC master + GST rate config (configurable; clay building bricks usually HSN 6904, confirm with the client's CA) | P3 | ⬜ |
| GST-02 | CGST+SGST vs IGST by place of supply | P8 | ⬜ |
| GST-03 | GST input on purchases | P7 | ⬜ |
| GST-04 | GSTR-1 register (B2B, B2C, HSN summary) with Excel export | P10 | ⬜ |
| GST-05 | GSTR-3B summary register | P10 | ⬜ |
| GST-06 | GST sales and purchase reports | P10 | ⬜ |

## Data
Planned tables: hsn_codes, gst_rates (+ tax columns on bills/invoices)

## Screens
Web: HSN/GST settings, GSTR-1 register + Excel, GSTR-3B summary, GST sales/purchase reports.

## Accounting effect
Output/Input CGST/SGST/IGST ledgers under Duties & Taxes.

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
