import { apiClient } from '@/lib/api-client';
import type {
  CreateCreditNoteInput,
  CreateCustomerReceiptInput,
  CreateDebitNoteInput,
  CreateQuotationInput,
  CreateSalesInvoiceInput,
  CreateSalesOrderInput,
  QuotationStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
} from '@brics/shared';

function query<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface SalesCharge {
  id: string;
  parentType: 'quotation' | 'sales_order' | 'sales_invoice';
  parentId: string;
  kind: 'loading' | 'transport' | 'other';
  label: string;
  amount: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
}

export interface Quotation {
  id: string;
  quoteNo: string;
  customerPartyId: string;
  siteId: string;
  quoteDate: string;
  validUntil: string | null;
  status: QuotationStatus;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
  notes: string | null;
}

export interface QuotationLine {
  id: string;
  itemId: string;
  quantity: string;
  rate: string;
  discount: string;
  taxableAmount: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  description: string | null;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  customerPartyId: string;
  siteId: string;
  quotationId: string | null;
  orderDate: string;
  expectedDate: string | null;
  status: SalesOrderStatus;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
}

export interface SalesOrderLine extends QuotationLine {
  invoicedQuantity: string;
}

export interface SalesInvoice {
  id: string;
  invoiceNo: string;
  customerPartyId: string;
  siteId: string;
  salesOrderId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  customerPoNo: string | null;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
  /** Maintained as receipts allocate — outstanding is total minus this. */
  paidAmount: string;
  status: SalesInvoiceStatus;
  voucherId: string;
  notes: string | null;
}

export interface SalesInvoiceLine extends QuotationLine {
  warehouseId: string;
  hsnCode: string | null;
  stockMovementId: string;
}

export interface CustomerReceipt {
  id: string;
  customerPartyId: string;
  siteId: string;
  receiptDate: string;
  mode: 'cash' | 'bank' | 'upi';
  depositToLedgerId: string;
  amount: string;
  reference: string | null;
  voucherId: string;
}

export interface CreditNote {
  id: string;
  noteNo: string;
  customerPartyId: string;
  siteId: string;
  invoiceId: string | null;
  noteDate: string;
  reason: string;
  taxableAmount: string;
  taxAmount: string;
  totalAmount: string;
  restocked: boolean;
}

export type DebitNote = Omit<CreditNote, 'restocked'>;

export interface AgeingInvoice {
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  outstanding: string;
  daysOverdue: number;
  bucket: string;
}

export interface AgeingCustomer {
  customerPartyId: string;
  customerName: string;
  outstanding: string;
  buckets: Record<string, string>;
  invoices: AgeingInvoice[];
}

export interface ReceivablesAgeing {
  asOf: string;
  customers: AgeingCustomer[];
  totals: Record<string, string>;
}

export interface ListParams {
  page?: number;
  limit?: number;
  customerPartyId?: string;
  siteId?: string;
  status?: string;
  invoiceId?: string;
  unpaidOnly?: 'true' | 'false';
  from?: string;
  to?: string;
}

// ── quotations ────────────────────────────────────────────────────────────────

export const fetchQuotations = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<Quotation>(`/sales/quotations${query(params)}`, signal);

export const fetchQuotation = (id: string, signal?: AbortSignal) =>
  apiClient.get<{ quote: Quotation; lines: QuotationLine[]; charges: SalesCharge[] }>(
    `/sales/quotations/${id}`,
    signal,
  );

export const createQuotation = (dto: CreateQuotationInput) => apiClient.post<Quotation>('/sales/quotations', dto);

export const changeQuotationStatus = (id: string, dto: { status: QuotationStatus; reason?: string | null }) =>
  apiClient.patch<Quotation>(`/sales/quotations/${id}/status`, dto);

// ── sales orders ──────────────────────────────────────────────────────────────

export const fetchSalesOrders = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<SalesOrder>(`/sales/orders${query(params)}`, signal);

export const fetchSalesOrder = (id: string, signal?: AbortSignal) =>
  apiClient.get<{ order: SalesOrder; lines: SalesOrderLine[]; charges: SalesCharge[] }>(`/sales/orders/${id}`, signal);

export const createSalesOrder = (dto: CreateSalesOrderInput) => apiClient.post<SalesOrder>('/sales/orders', dto);

export const cancelSalesOrder = (id: string, reason?: string) =>
  apiClient.patch<SalesOrder>(`/sales/orders/${id}/status`, { status: 'cancelled', reason: reason ?? null });

// ── invoices ──────────────────────────────────────────────────────────────────

export const fetchInvoices = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<SalesInvoice>(`/sales/invoices${query(params)}`, signal);

export const fetchInvoice = (id: string, signal?: AbortSignal) =>
  apiClient.get<{
    invoice: SalesInvoice;
    lines: SalesInvoiceLine[];
    charges: SalesCharge[];
    allocations: { id: string; amount: string; customerReceiptId: string }[];
  }>(`/sales/invoices/${id}`, signal);

export const createInvoice = (dto: CreateSalesInvoiceInput) => apiClient.post<SalesInvoice>('/sales/invoices', dto);

/**
 * SAL-04 — fetch the invoice PDF with the current Bearer token (held in memory
 * per ADR-016) and return an object URL. Callers open it in a new tab and are
 * responsible for `URL.revokeObjectURL` once the tab is closed.
 */
export async function fetchInvoicePdfObjectUrl(id: string): Promise<string> {
  const blob = await apiClient.getBlob(`/sales/invoices/${id}/pdf`);
  return URL.createObjectURL(blob);
}

// ── receipts ──────────────────────────────────────────────────────────────────

export const fetchReceipts = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<CustomerReceipt>(`/sales/receipts${query(params)}`, signal);

export const createReceipt = (dto: CreateCustomerReceiptInput) =>
  apiClient.post<CustomerReceipt>('/sales/receipts', dto);

// ── credit / debit notes ──────────────────────────────────────────────────────

export const fetchCreditNotes = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<CreditNote>(`/sales/credit-notes${query(params)}`, signal);

export const createCreditNote = (dto: CreateCreditNoteInput) => apiClient.post<CreditNote>('/sales/credit-notes', dto);

export const fetchDebitNotes = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<DebitNote>(`/sales/debit-notes${query(params)}`, signal);

export const createDebitNote = (dto: CreateDebitNoteInput) => apiClient.post<DebitNote>('/sales/debit-notes', dto);

// ── receivables ageing ────────────────────────────────────────────────────────

export const fetchReceivablesAgeing = (
  params: { asOf?: string; customerPartyId?: string; siteId?: string } = {},
  signal?: AbortSignal,
) => apiClient.get<ReceivablesAgeing>(`/sales/receivables-ageing${query(params)}`, signal);
