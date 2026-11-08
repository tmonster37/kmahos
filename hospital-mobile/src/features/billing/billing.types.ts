export type BillCategory = 'EXAM' | 'TEST' | 'PRESCRIPTION' | string;
export type ReconciliationStatus = 'RECONCILED' | 'UNRECONCILED' | string;

export interface BillItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export interface PendingBill {
  billId: string;
  bookingCode: string;
  bookingId: string;
  category: BillCategory;
  items: BillItem[];
  totalAmount: number | null;
  reconciliationStatus: ReconciliationStatus;
  status: string;
  createdAt?: string | null;
}

export interface Transaction {
  transactionId: string;
  amount: number;
  transactionType: string;
  paymentMethod: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | string;
  vnpayTxnRef?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  orderCode?: number | null;
  isVerified?: boolean | null;
}

export interface PaymentGatewayResponse {
  transactionId: string;
  txnRef: string;
  paymentMethod: string;
  transactionType: string;
  amount: number;
  status: string;
  qrImageUrl?: string | null;
  qrCode?: string | null;
  paymentUrl?: string | null;
  deeplink?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  accountHolder?: string | null;
  transferContent?: string | null;
  description?: string | null;
  orderCode?: number | null;
}

export function isBillPayable(bill: PendingBill): boolean {
  return (
    bill.reconciliationStatus === 'RECONCILED' &&
    bill.status === 'UNPAID' &&
    typeof bill.totalAmount === 'number' &&
    bill.totalAmount > 0
  );
}

export function formatServerVnd(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'Chưa có dữ liệu';
  }
  return `${amount.toLocaleString('vi-VN')} đ`;
}

