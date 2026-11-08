import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
import { PaymentGatewayResponse, Transaction } from './billing.types';
import { sanitizeTransaction } from './billing.api';

export interface PaymentApi {
  createPaymentLink(billId: string): Promise<PaymentGatewayResponse>;
  checkPaymentStatus(txnRef: string): Promise<Transaction>;
  syncPayOS(orderCode: number): Promise<Transaction>;
}

export interface ParsedPaymentReturnParams {
  txnRef: string | null;
  orderCode: number | null;
  providerCancelled: boolean;
}

export function parsePaymentReturnParams(
  rawParams: Record<string, string | string[] | undefined>
): ParsedPaymentReturnParams {
  const rawTxnRef = Array.isArray(rawParams.txnRef)
    ? rawParams.txnRef[0]
    : rawParams.txnRef;
  const rawOrderCode = Array.isArray(rawParams.orderCode)
    ? rawParams.orderCode[0]
    : rawParams.orderCode;
  const rawCancel = Array.isArray(rawParams.cancel)
    ? rawParams.cancel[0]
    : rawParams.cancel;
  const rawStatus = Array.isArray(rawParams.status)
    ? rawParams.status[0]
    : rawParams.status;

  const txnRef =
    rawTxnRef && /^[A-Za-z0-9_-]{1,64}$/.test(rawTxnRef.trim())
      ? rawTxnRef.trim()
      : null;

  const parsedOrder =
    rawOrderCode && /^\d{1,19}$/.test(rawOrderCode.trim())
      ? Number(rawOrderCode.trim())
      : null;

  const providerCancelled =
    String(rawCancel ?? '').toLowerCase() === 'true' ||
    String(rawStatus ?? '').toUpperCase() === 'CANCELLED';

  return {
    txnRef,
    orderCode: parsedOrder && Number.isSafeInteger(parsedOrder) ? parsedOrder : null,
    providerCancelled,
  };
}

export function createPaymentApi(client: AxiosInstance = apiClient): PaymentApi {
  return {
    async createPaymentLink(billId: string): Promise<PaymentGatewayResponse> {
      const cleanBillId = billId.trim();
      if (!cleanBillId) {
        throw new Error('Mã hóa đơn viện phí không hợp lệ.');
      }

      const raw = (await client.post('/api/payment/patient/payos/create-link', {
        billId: cleanBillId,
      })) as unknown as PaymentGatewayResponse;

      return {
        transactionId: String(raw.transactionId ?? ''),
        txnRef: String(raw.txnRef ?? ''),
        paymentMethod: String(raw.paymentMethod ?? ''),
        transactionType: String(raw.transactionType ?? ''),
        amount: Number(raw.amount ?? 0),
        status: String(raw.status ?? 'PENDING'),
        qrImageUrl: raw.qrImageUrl ?? null,
        qrCode: raw.qrCode ?? null,
        paymentUrl: raw.paymentUrl ?? null,
        deeplink: raw.deeplink ?? null,
        bankName: raw.bankName ?? null,
        bankAccountNo: raw.bankAccountNo ?? null,
        accountHolder: raw.accountHolder ?? null,
        transferContent: raw.transferContent ?? null,
        description: raw.description ?? null,
        orderCode: raw.orderCode != null ? Number(raw.orderCode) : null,
      };
    },

    async checkPaymentStatus(txnRef: string): Promise<Transaction> {
      const cleanTxnRef = txnRef.trim();
      if (!cleanTxnRef) {
        throw new Error('Mã tham chiếu giao dịch không hợp lệ.');
      }
      const raw = (await client.get(
        `/api/payment/status/${encodeURIComponent(cleanTxnRef)}`
      )) as unknown as Record<string, unknown>;
      return sanitizeTransaction(raw);
    },

    async syncPayOS(orderCode: number): Promise<Transaction> {
      if (!Number.isInteger(orderCode) || orderCode <= 0) {
        throw new Error('Mã đơn hàng PayOS không hợp lệ.');
      }
      const raw = (await client.post(
        `/api/payment/payos/sync/${encodeURIComponent(String(orderCode))}`
      )) as unknown as Record<string, unknown>;
      return sanitizeTransaction(raw);
    },
  };
}

export const paymentApi = createPaymentApi();

