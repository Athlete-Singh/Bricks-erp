-- ADM-09 — what a restored copy of BRICS must satisfy before anyone calls the
-- backup good. Run by scripts/db/restore-drill.sh; fails loudly on any breach.
\pset footer off

\echo 'Latest migration in the restored copy:'
select name from migrations order by timestamp desc limit 1;

\echo 'What came back:'
select 'companies' as "table", count(*) as rows from companies
union all select 'users', count(*) from users
union all select 'ledgers', count(*) from ledgers
union all select 'vouchers', count(*) from vouchers
union all select 'voucher_lines', count(*) from voucher_lines
union all select 'stock_movements', count(*) from stock_movements
union all select 'production_batches', count(*) from production_batches
union all select 'sales_invoices', count(*) from sales_invoices
union all select 'labour_attendance', count(*) from labour_attendance;

do $$
declare
  unbalanced int;
  total_dr numeric;
  total_cr numeric;
  owners int;
begin
  -- Every voucher still balances, line for line, after the round trip.
  select count(*) into unbalanced from (
    select voucher_id from voucher_lines group by voucher_id having sum(debit) <> sum(credit)
  ) v;
  if unbalanced > 0 then
    raise exception 'Restore check failed: % vouchers do not balance', unbalanced;
  end if;

  select coalesce(sum(debit), 0), coalesce(sum(credit), 0) into total_dr, total_cr from voucher_lines;
  if total_dr <> total_cr then
    raise exception 'Restore check failed: the books total Dr % and Cr %', total_dr, total_cr;
  end if;

  -- Someone must be able to sign in to the restored copy.
  select count(*) into owners from users where is_active;
  if owners = 0 then
    raise exception 'Restore check failed: no active user in the restored copy';
  end if;

  raise notice 'Books balance: Dr % = Cr %; % active users', total_dr, total_cr, owners;
end $$;
