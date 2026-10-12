# M11 GST Engine

**Purpose:** HSN/rate config, CGST/SGST vs IGST, input GST, GSTR-1 and GSTR-3B registers, GST reports.
**Phase:** P3, P7, P8, P10 · **Status:** ✅ complete (GST-01…03 in P3/P7/P8; GST-04…07 in P10)

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| GST-01 | HSN/SAC master + GST rate config (configurable; clay building bricks usually HSN 6904, confirm with the client's CA) | P3 | ⬜ |
| GST-02 | CGST+SGST vs IGST by place of supply | P8 | ⬜ |
| GST-03 | GST input on purchases | P7 | ⬜ |
| GST-04 | GSTR-1 register (B2B, B2C, HSN summary) with Excel export | P10 | ✅ |
| GST-05 | GSTR-3B summary register | P10 | ✅ |
| GST-06 | GST sales and purchase reports | P10 | ✅ |

## Tables (planned)
hsn_codes, gst_rates (+ tax columns on bills/invoices)

## Endpoints
_(none yet — add one line each, mirror in API_INDEX.md)_

## Screens (planned)
Web: HSN/GST settings, GSTR-1 register + Excel, GSTR-3B summary, GST sales/purchase reports.

## Postings
Output/Input CGST/SGST/IGST ledgers under Duties & Taxes.

## Known gaps / notes
-
