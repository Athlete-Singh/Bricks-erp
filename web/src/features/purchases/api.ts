import { apiClient } from '@/lib/api-client';
import type {
  CreateGrnInput,
  CreatePurchaseBillInput,
  CreatePurchaseOrderInput,
  CreatePurchaseReturnInput,
  CreateSupplierPaymentInput,
  PurchaseOrderStatus,
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

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierPartyId: string;
  siteId: string;
  orderDate: string;
  expectedDate: string | null;
  status: PurchaseOrderStatus;
  notes: string | null;
}

export interface PurchaseOrderLine {
  id: string;
  itemId: string;
  quantity: string;
  rate: string;
  receivedQuantity: string;
}

export interface GoodsReceipt {
  id: string;
  grnNo: string;
  supplierPartyId: string;
  siteId: string;
  purchaseOrderId: string | null;
  receiptDate: string;
  challanNo: string | null;
}

export interface GoodsReceiptLine {
  id: string;
  itemId: string;
  warehouseId: string;
  quantity: string;
  stockMovementId: string;
}

export interface PurchaseBill {
  id: string;
  supplierPartyId: string;
  siteId: string;
  supplierInvoiceNo: string;
  billDate: string;
  dueDate: string | null;
  grnId: string | null;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
  /** Maintained as payments allocate — outstanding is total minus this. */
  paidAmount: string;
  voucherId: string;
}

export interface PurchaseBillLine {
  id: string;
  itemId: string;
  quantity: string;
  rate: string;
  taxableAmount: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
}

export interface AgeingBill {
  billId: string;
  supplierInvoiceNo: string;
  billDate: string;
  dueDate: string | null;
  outstanding: string;
  daysOverdue: number;
  bucket: string;
}

export interface AgeingSupplier {
  supplierPartyId: string;
  supplierName: string;
  outstanding: string;
  buckets: Record<string, string>;
  bills: AgeingBill[];
}

export interface PayablesAgeing {
  asOf: string;
  suppliers: AgeingSupplier[];
  totals: Record<string, string>;
}

export interface ListParams {
  page?: number;
  limit?: number;
  supplierPartyId?: string;
  siteId?: string;
  status?: string;
  purchaseOrderId?: string;
  unpaidOnly?: 'true' | 'false';
  from?: string;
  to?: string;
}

export const fetchOrders = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<PurchaseOrder>(`/purchases/orders${query(params)}`, signal);

export const fetchOrder = (id: string, signal?: AbortSignal) =>
  apiClient.get<{ order: PurchaseOrder; lines: PurchaseOrderLine[] }>(`/purchases/orders/${id}`, signal);

export const createOrder = (dto: CreatePurchaseOrderInput) => apiClient.post<PurchaseOrder>('/purchases/orders', dto);

export const fetchReceipts = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<GoodsReceipt>(`/purchases/goods-receipts${query(params)}`, signal);

export const fetchReceipt = (id: string, signal?: AbortSignal) =>
  apiClient.get<{ receipt: GoodsReceipt; lines: GoodsReceiptLine[] }>(`/purchases/goods-receipts/${id}`, signal);

export const createReceipt = (dto: CreateGrnInput) => apiClient.post<GoodsReceipt>('/purchases/goods-receipts', dto);

export const fetchBills = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<PurchaseBill>(`/purchases/bills${query(params)}`, signal);

export const fetchBill = (id: string, signal?: AbortSignal) =>
  apiClient.get<{ bill: PurchaseBill; lines: PurchaseBillLine[]; allocations: unknown[] }>(
    `/purchases/bills/${id}`,
    signal,
  );

export const createBill = (dto: CreatePurchaseBillInput) => apiClient.post<PurchaseBill>('/purchases/bills', dto);

export const createPayment = (dto: CreateSupplierPaymentInput) => apiClient.post<unknown>('/purchases/payments', dto);

export const createReturn = (dto: CreatePurchaseReturnInput) => apiClient.post<unknown>('/purchases/returns', dto);

export const fetchPayablesAgeing = (
  params: { asOf?: string; supplierPartyId?: string; siteId?: string } = {},
  signal?: AbortSignal,
) => apiClient.get<PayablesAgeing>(`/purchases/payables-ageing${query(params)}`, signal);
