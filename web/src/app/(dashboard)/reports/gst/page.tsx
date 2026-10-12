'use client';

import { Download, FileCheck2 } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatDate, formatINR } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { fetchGstr1CsvObjectUrl, type GstrLine } from '@/features/financials/api';
import { useGstReconciliation, useGstr1, useGstr3b } from '@/features/financials/hooks';

function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** GST-04…07 — the registers, the summary, and the reconciliation. */
export default function GstPage() {
  const { can } = useSession();
  const [month, setMonth] = useState(thisMonth());

  const gstr1 = useGstr1({ month });
  const gstr3b = useGstr3b({ month });
  const recon = useGstReconciliation({ month });

  if (!can(PERMISSIONS.TAXES_VIEW)) {
    return <Alert variant="info">You do not have access to the GST registers.</Alert>;
  }

  const download = async () => {
    const url = await fetchGstr1CsvObjectUrl(month);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR1-${month}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Input
          label="Return month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="max-w-[12rem]"
        />
        <Button variant="outline" onClick={() => void download()}>
          <Download className="h-4 w-4" aria-hidden /> GSTR-1 CSV
        </Button>
      </div>

      {/* ── GST-07, first: it is the question an owner actually asks ────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Reconciliation</h2>
        {recon.isLoading && <Skeleton className="h-28 w-full" />}
        {recon.isError && <Alert variant="error">{messageOf(recon.error)}</Alert>}
        {recon.data && (
          <>
            {recon.data.meta.clean ? (
              <Alert variant="success">
                The register and the books agree, and every invoice carries an HSN. This month is ready to file.
              </Alert>
            ) : (
              <Alert variant="warning">
                {recon.data.meta.mismatchCount > 0 &&
                  `${recon.data.meta.mismatchCount} figure${recon.data.meta.mismatchCount === 1 ? '' : 's'} differ between the register and the books. `}
                {recon.data.meta.invoicesMissingHsn > 0 &&
                  `${formatINR(recon.data.meta.missingHsnTaxable)} of sales has no HSN — the portal rejects those rows.`}
              </Alert>
            )}
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Component</th>
                    <th className="px-3 py-2 text-right font-medium">Per register</th>
                    <th className="px-3 py-2 text-right font-medium">Per books</th>
                    <th className="px-3 py-2 text-right font-medium">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {recon.data.items.map((line) => (
                    <tr key={line.label} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2">{line.label}</td>
                      <td className="px-3 py-2 text-right">{formatINR(line.perRegister)}</td>
                      <td className="px-3 py-2 text-right">{formatINR(line.perBooks)}</td>
                      <td className={`px-3 py-2 text-right ${line.matches ? '' : 'font-medium text-danger'}`}>
                        {line.matches ? '—' : formatINR(line.difference)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── GST-05 ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">GSTR-3B summary</h2>
        {gstr3b.data && (
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Output tax" value={formatINR(gstr3b.data.meta.totals.outputTax)} />
            <SummaryCard label="Input credit" value={formatINR(gstr3b.data.meta.totals.inputCredit)} />
            <SummaryCard
              label="Net payable"
              value={formatINR(gstr3b.data.meta.totals.netPayable)}
              strong
              danger={Number(gstr3b.data.meta.totals.netPayable) > 0}
            />
          </div>
        )}
      </section>

      {/* ── GST-04 ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">GSTR-1 register</h2>
        {gstr1.isLoading && <Skeleton className="h-40 w-full" />}
        {gstr1.data && (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryCard label="B2B invoices" value={String(gstr1.data.meta.totals.b2bCount)} />
              <SummaryCard label="B2C invoices" value={String(gstr1.data.meta.totals.b2cCount)} />
              <SummaryCard label="Taxable" value={formatINR(gstr1.data.meta.totals.taxableAmount)} />
              <SummaryCard
                label="Tax"
                value={formatINR(
                  String(
                    Number(gstr1.data.meta.totals.cgstAmount) +
                      Number(gstr1.data.meta.totals.sgstAmount) +
                      Number(gstr1.data.meta.totals.igstAmount),
                  ),
                )}
              />
            </div>

            <InvoiceTable title="B2B — registered customers" lines={gstr1.data.meta.b2b} showGstin />
            <InvoiceTable title="B2C — unregistered customers" lines={gstr1.data.meta.b2c} />

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
              <h3 className="text-xs font-medium uppercase text-muted-foreground">HSN summary</h3>
              {gstr1.data.meta.hsnSummary.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing invoiced this month.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-1.5 pr-2 font-medium">HSN</th>
                        <th className="py-1.5 pr-2 font-medium">Description</th>
                        <th className="py-1.5 pr-2 text-right font-medium">Quantity</th>
                        <th className="py-1.5 text-right font-medium">Taxable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1.data.meta.hsnSummary.map((h) => (
                        <tr key={h.hsnCode} className="border-b border-border/60 last:border-0">
                          <td className="py-1.5 pr-2">
                            {h.hsnCode === '(none)' ? (
                              // The portal refuses these rows, so they are named.
                              <Badge variant="danger">no HSN</Badge>
                            ) : (
                              h.hsnCode
                            )}
                          </td>
                          <td className="py-1.5 pr-2">{h.description}</td>
                          <td className="py-1.5 pr-2 text-right">{h.quantity}</td>
                          <td className="py-1.5 text-right">{formatINR(h.taxableAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function InvoiceTable({ title, lines, showGstin }: { title: string; lines: GstrLine[]; showGstin?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <h3 className="text-xs font-medium uppercase text-muted-foreground">{title}</h3>
      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          <FileCheck2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          None this month.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium">Invoice</th>
                <th className="py-1.5 pr-2 font-medium">Date</th>
                <th className="py-1.5 pr-2 font-medium">Customer</th>
                {showGstin && <th className="py-1.5 pr-2 font-medium">GSTIN</th>}
                <th className="py-1.5 pr-2 text-right font-medium">Taxable</th>
                <th className="py-1.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.invoiceNo} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{l.invoiceNo}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{formatDate(l.invoiceDate)}</td>
                  <td className="py-1.5 pr-2">{l.customerName}</td>
                  {showGstin && <td className="py-1.5 pr-2">{l.gstin ?? '—'}</td>}
                  <td className="py-1.5 pr-2 text-right">{formatINR(l.taxableAmount)}</td>
                  <td className="py-1.5 text-right">{formatINR(l.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg ${strong ? 'font-semibold' : ''} ${danger ? 'text-danger' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}
