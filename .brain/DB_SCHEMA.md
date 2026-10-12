# DB SCHEMA — compact (PostgreSQL 16)

Conventions: uuid PK `id`; `company_id` on every business table; `created_at, updated_at, created_by, updated_by`; `deleted_at` for soft delete; money NUMERIC(18,2); qty INTEGER.
Status: ⬜ planned · ✅ migrated. Update when migrations land.

## Planned (from Functional Spec §19, adjusted) — none migrated yet
| Area | Tables (key columns → relations) | Phase |
|---|---|---|
| Platform | companies (name, gstin, pan, state_code) · sites (company_id, type kiln/branch/depot) · financial_years (start, end, is_locked) · users (email, mobile, password_hash) · user_companies (user_id, company_id, role_id) · user_sites · roles · permissions · role_permissions · refresh_tokens · audit_logs (entity, entity_id, action, before, after, user_id) | P1 |
| Accounting | ledger_groups (parent_id, nature) · ledgers (group_id, party_id?, opening_dr/cr) · voucher_types · vouchers (type, number, date, fy_id, status, source_type, source_id, reversal_of) · voucher_lines (voucher_id, ledger_id, debit, credit, kiln_id, party_id) | P2 |
| Masters | parties (party_types[], gstin, state_code, ledger_id) · units · items (category, unit_id, hsn_id) · brick_types (grade) · warehouses (site_id) · vehicles (own/hired, type) · drivers · hsn_codes · gst_rates (hsn_id, rate, effective_from) · wage_rates (activity, per_1000_rate, effective_from) | P3 |
| Inventory | stock_movements (item_id/brick_type_id, warehouse_id, qty_in, qty_out, source_type, source_id, date) · stock_balances (cached) · stock_adjustments | P4 |
| Production | production_batches (site_id, chamber, date; status) · production_entries (batch_id, stage, counts, sardar_party_id, warehouse_id) · production_sorting_outputs (entry_id, brick_type_id, qty → stock_movement_id) · production_consumptions (entry_id, item_id, warehouse_id, qty → stock_movement_id) | P5 |
| Labour | labour_groups (sardar_party_id) · workers · attendance · wage_entries (source, qty, rate, amount) · advances · deductions · settlements | P6 |
| Purchase | purchase_orders · purchase_order_items · grns · grn_items · purchase_bills · purchase_bill_items · purchase_returns | P7 |
| Sales | quotations (+items) · sales_orders (+items) · sales_invoices (+items, place_of_supply, cgst/sgst/igst) · credit_notes · debit_notes · receipt_allocations | P8 |
| Dispatch/Transport | dispatches (invoice_id/so_id, vehicle_id, driver_id, status, ack_*) · dispatch_items · trips · fuel_entries · vehicle_maintenance | P9 |
| Expenses/Bank | expense_categories · expenses (payment_mode) · bank_accounts (ledger_id) | P10 |
| System | idempotency_keys (company_id, endpoint, key, request_hash, response_status, response_body — unique on (company_id, endpoint, key)) · sync_logs | P5.1c/P12 |

## Migrated
| Migration | Tables / changes |
|---|---|
| `1700000000000-AuthAndCompanyTables` | `companies` · `sites` · `financial_years` · `users` · `roles` · `permissions` · `role_permissions` · `user_companies` · `user_sites` · `refresh_tokens` · `audit_logs` |
| `1700000300000-Vouchers` | `vouchers` (type, number, date, fy_id, status posted/reversed, source_type/source_id, reversal_of_id, site_id) · `voucher_lines` (ledger_id, debit, credit, party_id, site_id, line_order) · `voucher_sequences` (company+fy+type → last_number). CHECKs: status in the two values · line amounts non-negative · **a line is a debit or a credit, never both and never neither**. Unique: voucher number per company · one sequence row per company+fy+type · a voucher reversed at most once |
| `1700000200000-ChartOfAccounts` | `ledger_groups` (company_id, code, parent_id, nature, is_direct) · `ledgers` (group_id, code, party_id?, opening_debit/credit, opening_financial_year_id) · `voucher_types` (code, prefix). Per company. CHECKs: nature in the four values · opening amounts non-negative · a ledger opens on **one side only**. Unique per company among live rows: group code, group name, ledger name, ledger code, voucher-type code; one ledger per party |
| `1700000100000-AuthHardening` | indexes on every `company_id`/FK used by tenant reads · unique `(user_id, company_id)`, `(user_id, site_id)`, `(role_id, permission_id)` · unique `(company_id, code)` on live sites · partial unique "one active FY per company" · `roles` unique moved from `(code)` to `(code, company_id)` · `created_at` on `user_companies`, `user_sites`, `refresh_tokens` |
| `1700000400000-Parties` | `parties` (party_types, gstin, pan, state_code, address, phone, email, opening_debit/credit, ledger_id) · `companies.gst_scheme`. CHECKs: opening on one side only, non-negative. Unique: ledger_id, name per company among live rows |
| `1791900000000-ProductionConsumptions` | `production_consumptions` (entry_id, item_id, warehouse_id, quantity, stock_movement_id). CHECK quantity > 0. Partial unique on (entry_id, item_id, warehouse_id). FKs to production_entries CASCADE, items/warehouses/stock_movements RESTRICT. |
| `1792000000000-IdempotencyKeys` | `idempotency_keys` (company_id, user_id, key, endpoint, request_hash sha-256, response_status, response_body jsonb). Unique on (company_id, endpoint, key). FK company_id → companies CASCADE. CHECK status in [100,599]. |
| `1792100000000-LabourEngine` | `labour_groups` · `workers` · `labour_attendance` · `labour_advances` · `labour_deductions` · `labour_settlements`. FKs with CASCADE/RESTRICT, amount/status CHECKs, company_id indexes and partial unique business keys. |
- `labour_wage_accruals` — one row per wage-accrual run: `site_id`, `sardar_party_id`, `period_from`,
  `period_to`, `gross_wages`, `voucher_id`. Exists so the same work cannot be paid for twice — an accrual
  whose period overlaps an existing one for that Sardar is refused (ADR-035).
| `1792300000000-Purchases` | `purchase_orders` + `purchase_order_lines` · `goods_receipts` + `goods_receipt_lines` · `purchase_bills` + `purchase_bill_lines` · `supplier_payments` + `supplier_payment_allocations` · `purchase_returns` + `purchase_return_lines`. CHECKs: PO status in {open, partial, received, cancelled} · bills `total = taxable + cgst + sgst + igst` · bills `paid <= total` · a line is one GST kind (CGST + SGST **or** IGST, never both). Unique: PO/GRN number per company; `(supplier_party_id, supplier_invoice_no)` per company (live); one allocation row per `(payment, bill)`. FKs CASCADE to parents, RESTRICT to masters. |
| `1792400000000-Sales` | `quotations` + `quotation_lines` · `sales_orders` + `sales_order_lines` · `sales_invoices` + `sales_invoice_lines` · `sales_charges` (polymorphic parent: quote/SO/invoice) · `customer_receipts` + `customer_receipt_allocations` · `credit_notes` + `credit_note_lines` · `debit_notes` + `debit_note_lines`. 13 tables. CHECKs: all status enums (quote 6-way, SO 4-way, invoice 4-way); invoice `total = taxable + cgst + sgst + igst` and `paid <= total`; `total = taxable + tax` on notes; one GST kind per line (`cgst_rate + sgst_rate = 0 OR igst_rate = 0`); credit-note lines `quantity IS NULL OR warehouse_id IS NOT NULL` (OQ #19). Unique: quote/order/invoice/note numbers per company; one allocation per (receipt, invoice). FKs CASCADE to parent docs, RESTRICT to vouchers/parties/items/warehouses/stock_movements. Migration also backfills `LOADING_INCOME` and `OTHER_SALES_INCOME` ledgers onto every company. |

Seed: `pnpm seed` fills `roles`, `permissions`, `role_permissions` (9 roles, idempotent).
