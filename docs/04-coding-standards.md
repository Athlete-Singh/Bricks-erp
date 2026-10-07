# 04 — Coding standards

The short rules are in [`.brain/CONVENTIONS.md`](../.brain/CONVENTIONS.md). This page shows why, with examples.

## 1. Money is never a float
```ts
// ❌ bad
const total = qty * 6.5 + 0.1;            // 0.30000000000000004 problems
// ✅ good
import Decimal from 'decimal.js';
const total = new Decimal(qty).div(1000).mul(rate).toDecimalPlaces(2); // rate per 1,000
```

## 2. Thin controllers, logic in services
```ts
// ❌ bad: rules in the controller, direct repo writes
@Post() create(@Body() b) { if (b.qty > stock) throw …; return this.repo.save(b); }
// ✅ good
@Post() @RequirePermissions('sales.invoice.create')
create(@Body() dto: CreateInvoiceDto, @CurrentTenant() t: Tenant) { return this.invoices.create(t, dto); }
```

## 3. Stock and journals in one transaction
```ts
// ✅ good
await this.dataSource.transaction(async (em) => {
  const inv = await em.save(SalesInvoice, invoice);
  await this.stock.move(em, { source: inv, lines: outLines });
  await this.posting.post(em, buildInvoiceJournal(inv)); // throws if Dr ≠ Cr → everything rolls back
});
```

## 4. Never trust `company_id` from the client
```ts
// ❌ bad
repo.find({ where: { companyId: query.companyId } });
// ✅ good
repo.find({ where: { companyId: tenant.companyId } });
```

## 5. Web: no fetch in components
```tsx
// ❌ bad
useEffect(() => { fetch('/api/v1/parties').then(…) }, []);
// ✅ good — features/parties/hooks/use-parties.ts
export const useParties = (p: ListParams) => useQuery({ queryKey: ['parties', 'list', p], queryFn: () => partiesApi.list(p) });
```

## 6. Web: design-system components only
```tsx
// ❌ bad
<button className="bg-[#0B6B3A] px-3 py-2 text-white">Save</button>
// ✅ good
<Button variant="primary">Save</Button>
```

## 7. Mobile: screen → provider → repository
```dart
// ❌ bad: dio inside a widget
onPressed: () => Dio().post('/production-entries', data: …)
// ✅ good
onPressed: () => ref.read(productionControllerProvider.notifier).save(entry) // writes Drift + enqueues sync
```

## 8. Small, named, tested
- One responsibility per file; split anything over ~300 lines.
- Test names describe behaviour: `posts CGST+SGST for intra-state invoice`.
- No commented-out code. Git remembers.
