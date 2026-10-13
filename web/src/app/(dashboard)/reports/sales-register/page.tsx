'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { PERMISSIONS, formatINR, formatQty, todayISO } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/data-table';
import { useSession } from '@/features/auth/use-auth';
import { useSalesRegister } from '@/features/dashboard/hooks';
import type { SalesRegisterRow } from '@/features/dashboard/api';
import { downloadCsv } from '@/features/dashboard/csv';

function startOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * RPT-03 — sales register. One line per invoice line, with the customer, the
 * brick type, the rate per unit, discount, every GST component split, and the
 * total. CSV export downloads what's on screen; filters apply.
 */
export default function SalesRegisterPage() {
  const { can } = useSession();
  const [filters, setFilters] = useState({ fromDate: startOfMonth(), toDate: todayISO() });
  const { data, isLoading } = useSalesRegister(filters);

  if (!can(PERMISSIONS.ACCOUNTS_VIEW)) {
    return <Alert variant="info">You do not have access to the accounts.</Alert>;
  }

  const rows = data?.items ?? [];
  const meta = data?.meta;

  const columns: Column<SalesRegisterRow>[] = [
    { key: 'date', header: 'Date', render: (r) => <span className="tabular-nums">{r.invoiceDate}</span> },
    { key: 'inv', header: 'Invoice', render: (r) => r.invoiceNo },
    { key: 'cust', header: 'Customer', render: (r) => r.customerName },
    { key: 'item', header: 'Item', render: (r) => r.itemName },
    {
      key: 'hsn',
      header: 'HSN',
      hideOnMobile: true,
      render: (r) => r.hsnCode ?? <span className="text-danger">missing</span>,
    },
    { key: 'qty', header: 'Qty', hideOnMobile: true, render: (r) => formatQty(Number(r.quantity)) },
    { key: 'rate', header: 'Rate', hideOnMobile: true, render: (r) => formatINR(r.rate) },
    { key: 'disc', header: 'Discount', hideOnMobile: true, render: (r) => formatINR(r.discount) },
    { key: 'tax', header: 'Taxable', render: (r) => formatINR(r.taxableAmount) },
    { key: 'cg', header: 'CGST', hideOnMobile: true, render: (r) => formatINR(r.cgstAmount) },
    { key: 'sg', header: 'SGST', hideOnMobile: true, render: (r) => formatINR(r.sgstAmount) },
    { key: 'ig', header: 'IGST', hideOnMobile: true, render: (r) => formatINR(r.igstAmount) },
    {
      key: 'total',
      header: 'Total',
      render: (r) => <span className="tabular-nums font-medium">{formatINR(r.lineTotal)}</span>,
    },
  ];

  const onExport = () => {
    if (!rows.length) return;
    downloadCsv(
      `sales-register-${filters.fromDate}-${filters.toDate}.csv`,
      [
        'Date',
        'Invoice',
        'Customer',
        'Item',
        'HSN',
        'Qty',
        'Rate',
        'Discount',
        'Taxable',
        'CGST',
        'SGST',
        'IGST',
        'Total',
      ],
      rows.map((r) => [
        r.invoiceDate,
        r.invoiceNo,
        r.customerName,
        r.itemName,
        r.hsnCode ?? '',
        r.quantity,
        r.rate,
        r.discount,
        r.taxableAmount,
        r.cgstAmount,
        r.sgstAmount,
        r.igstAmount,
        r.lineTotal,
      ]),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">From</span>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">To</span>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </label>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!rows.length}
          aria-label="Export sales register as CSV"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden /> Export CSV
        </Button>
      </div>

      {meta && rows.length > 0 && (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm">
          <span className="tabular-nums">{meta.rowCount}</span> line{meta.rowCount === 1 ? '' : 's'} · taxable{' '}
          <span className="tabular-nums font-medium text-foreground">{formatINR(meta.taxableAmount)}</span> · total{' '}
          <span className="tabular-nums font-medium text-foreground">{formatINR(meta.total)}</span>
        </div>
      )}

      <DataTable<SalesRegisterRow>
        columns={columns}
        rows={rows}
        rowKey={(r) => `${r.invoiceId}-${r.itemId}`}
        isLoading={isLoading}
        empty={<Alert variant="info">No invoices in this window.</Alert>}
      />
    </div>
  );
}
