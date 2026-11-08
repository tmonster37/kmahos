import { AxiosInstance } from 'axios';
import { createBillingApi } from '../billing.api';

describe('billing.api', () => {
  it('listsPendingBillsAndTransactions', async () => {
    const rawPendingBills = [
      {
        billId: 'BILL-EXAM-11111111-1111-1111-1111-111111111111',
        bookingCode: 'BK-2026-001',
        bookingId: '11111111-1111-1111-1111-111111111111',
        category: 'EXAM',
        items: [
          {
            itemId: 'EXAM-1',
            name: 'Khám chuyên khoa Nội Tổng Quát',
            quantity: 1,
            unitPrice: 120000,
            totalPrice: 120000,
            category: 'EXAM',
          },
        ],
        totalAmount: 120000,
        reconciliationStatus: 'RECONCILED',
        status: 'UNPAID',
        createdAt: '2026-11-07T08:30:00',
        patientName: 'ShouldBeStripped',
        patientPhone: '0900000000',
      },
    ];

    const rawTransactions = [
      {
        transactionId: 'txn-001',
        amount: 120000,
        transactionType: 'BOOKING_PAYMENT',
        paymentMethod: 'PAYOS',
        status: 'SUCCESS',
        vnpayTxnRef: 'PAYOS-TXN-001',
        description: 'Thanh toán BK-2026-001 [CAT:EXAM]',
        orderCode: 987654321,
        isVerified: true,
      },
    ];

    const mockClient = {
      get: jest.fn((url: string) => {
        if (url === '/api/payment/patient/pending-bills') {
          return Promise.resolve(rawPendingBills);
        }
        if (url === '/api/payment/history') {
          return Promise.resolve(rawTransactions);
        }
        return Promise.resolve([]);
      }),
    } as unknown as AxiosInstance;

    const api = createBillingApi(mockClient);
    const bills = await api.listPendingBills();
    const txns = await api.listTransactions(0, 10);

    expect(mockClient.get).toHaveBeenCalledWith('/api/payment/patient/pending-bills');
    expect(bills).toHaveLength(1);
    expect(bills[0].billId).toBe('BILL-EXAM-11111111-1111-1111-1111-111111111111');
    expect(bills[0].totalAmount).toBe(120000);
    expect((bills[0] as unknown as Record<string, unknown>).patientName).toBeUndefined();
    expect((bills[0] as unknown as Record<string, unknown>).patientPhone).toBeUndefined();

    expect(mockClient.get).toHaveBeenCalledWith('/api/payment/history', {
      params: { page: 0, size: 10 },
    });
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(120000);
    expect(txns[0].status).toBe('SUCCESS');
  });

  it('unreconciledBillHasNoPayableBalance', async () => {
    const mockClient = {
      get: jest.fn().mockResolvedValue([
        {
          billId: 'BILL-TEST-22222222-2222-2222-2222-222222222222',
          bookingCode: 'BK-2026-002',
          bookingId: '22222222-2222-2222-2222-222222222222',
          category: 'TEST',
          items: [],
          totalAmount: 350000,
          reconciliationStatus: 'UNRECONCILED',
          status: 'UNRECONCILED',
        },
      ]),
    } as unknown as AxiosInstance;

    const api = createBillingApi(mockClient);
    const bills = await api.listPendingBills();

    expect(bills).toHaveLength(1);
    expect(bills[0].reconciliationStatus).toBe('UNRECONCILED');
    expect(bills[0].totalAmount).toBeNull();
  });
});

