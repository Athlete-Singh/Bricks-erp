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
| Production | production_batches (site_id, chamber, date) · production_entries (batch_id, stage, brick_type_id, qty, labour_group_id) · production_wastage · fuel_consumptions | P5 |
| Labour | labour_groups (sardar_party_id) · workers · attendance · wage_entries (source, qty, rate, amount) · advances · deductions · settlements | P6 |
| Purchase | purchase_orders · purchase_order_items · grns · grn_items · purchase_bills · purchase_bill_items · purchase_returns | P7 |
| Sales | quotations (+items) · sales_orders (+items) · sales_invoices (+items, place_of_supply, cgst/sgst/igst) · credit_notes · debit_notes · receipt_allocations | P8 |
| Dispatch/Transport | dispatches (invoice_id/so_id, vehicle_id, driver_id, status, ack_*) · dispatch_items · trips · fuel_entries · vehicle_maintenance | P9 |
| Expenses/Bank | expense_categories · expenses (payment_mode) · bank_accounts (ledger_id) | P10 |
| System | idempotency_keys (key, company_id, response) · sync_logs | P1/P12 |

## Migrated
| Migration | Tables / changes |
|---|---|
| `1700000000000-AuthAndCompanyTables` | `companies` · `sites` · `financial_years` · `users` · `roles` · `permissions` · `role_permissions` · `user_companies` · `user_sites` · `refresh_tokens` · `audit_logs` |
| `1700000300000-Vouchers` | `vouchers` (type, number, date, fy_id, status posted/reversed, source_type/source_id, reversal_of_id, site_id) · `voucher_lines` (ledger_id, debit, credit, party_id, site_id, line_order) · `voucher_sequences` (company+fy+type → last_number). CHECKs: status in the two values · line amounts non-negative · **a line is a debit or a credit, never both and never neither**. Unique: voucher number per company · one sequence row per company+fy+type · a voucher reversed at most once |
| `1700000200000-ChartOfAccounts` | `ledger_groups` (company_id, code, parent_id, nature, is_direct) · `ledgers` (group_id, code, party_id?, opening_debit/credit, opening_financial_year_id) · `voucher_types` (code, prefix). Per company. CHECKs: nature in the four values · opening amounts non-negative · a ledger opens on **one side only**. Unique per company among live rows: group code, group name, ledger name, ledger code, voucher-type code; one ledger per party |
| `1700000100000-AuthHardening` | indexes on every `company_id`/FK used by tenant reads · unique `(user_id, company_id)`, `(user_id, site_id)`, `(role_id, permission_id)` · unique `(company_id, code)` on live sites · partial unique "one active FY per company" · `roles` unique moved from `(code)` to `(code, company_id)` · `created_at` on `user_companies`, `user_sites`, `refresh_tokens` |

Seed: `pnpm seed` fills `roles`, `permissions`, `role_permissions` (9 roles, idempotent).
