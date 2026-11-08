import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
import { BillItem, PendingBill, Transaction } from './billing.types';

export interface BillingApi {
  listPendingBills(): Promise<PendingBill[]>;
  listTransactions(page?: number, size?: number): Promise<Transaction[]>;
}

interface RawPendingBillPayload {
  billId?: string;
  bookingCode?: string;
  bookingId?: string;
  category?: string;
  items?: BillItem[];
  totalAmount?: number | string | null;
  reconciliationStatus?: string;
  status?: string;
  createdAt?: string | null;
}

interface RawTransactionPayload {
  transactionId?: string;
  amount?: number | string;
  transactionType?: string;
  paymentMethod?: string;
  status?: string;
  vnpayTxnRef?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  orderCode?: number | null;
  isVerified?: boolean | null;
}

export function sanitizePendingBill(raw: RawPendingBillPayload): PendingBill {
  const reconciliationStatus = String(raw.reconciliationStatus ?? 'UNRECONCILED');
  const parsedTotal =
    reconciliationStatus === 'UNRECONCILED' || raw.totalAmount == null
      ? null
      : Number(raw.totalAmount);

  return {
    billId: String(raw.billId ?? ''),
    bookingCode: String(raw.bookingCode ?? ''),
    bookingId: String(raw.bookingId ?? ''),
    category: String(raw.category ?? ''),
    items: Array.isArray(raw.items)
      ? raw.items.map((item) => ({
          itemId: String(item.itemId ?? ''),
          name: String(item.name ?? ''),
          quantity: Number(item.quantity ?? 0),
          unitPrice: Number(item.unitPrice ?? 0),
          totalPrice: Number(item.totalPrice ?? 0),
          category: String(item.category ?? ''),
        }))
      : [],
    totalAmount:
      parsedTotal !== null && !Number.isNaN(parsedTotal) ? parsedTotal : null,
    reconciliationStatus,
    status: String(raw.status ?? 'UNRECONCILED'),
    createdAt: raw.createdAt ?? null,
  };
}

export function sanitizeTransaction(raw: RawTransactionPayload): Transaction {
  return {
    transactionId: String(raw.transactionId ?? ''),
    amount: Number(raw.amount ?? 0),
    transactionType: String(raw.transactionType ?? ''),
    paymentMethod: String(raw.paymentMethod ?? ''),
    status: String(raw.status ?? 'PENDING'),
    vnpayTxnRef: raw.vnpayTxnRef ?? null,
    description: raw.description ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    orderCode: raw.orderCode != null ? Number(raw.orderCode) : null,
    isVerified: raw.isVerified ?? null,
  };
}

export function createBillingApi(client: AxiosInstance = apiClient): BillingApi {
  return {
    async listPendingBills(): Promise<PendingBill[]> {
      const data = (await client.get(
        '/api/payment/patient/pending-bills'
      )) as unknown as RawPendingBillPayload[];
      if (!Array.isArray(data)) {
        return [];
      }
      return data
        .map(sanitizePendingBill)
        .filter((bill) => bill.billId.trim().length > 0);
    },

    async listTransactions(page = 0, size = 20): Promise<Transaction[]> {
      const data = (await client.get('/api/payment/history', {
        params: { page, size },
      })) as unknown as RawTransactionPayload[];
      if (!Array.isArray(data)) {
        return [];
      }
      return data
        .map(sanitizeTransaction)
        .filter((txn) => txn.transactionId.trim().length > 0);
    },
  };
}

export const billingApi = createBillingApi();

