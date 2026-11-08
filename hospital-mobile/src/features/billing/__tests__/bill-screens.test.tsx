import React from 'react';
import { render } from '@testing-library/react-native';
import PendingBillsListScreen from '@/app/(patient)/bills/index';
import { BillingApi } from '../billing.api';
import { PendingBill } from '../billing.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

describe('bill-screens', () => {
  it('rendersServerTotalOnly', async () => {
    const serverBills: PendingBill[] = [
      {
        billId: 'BILL-EXAM-100',
        bookingCode: 'BK-100',
        bookingId: 'book-100',
        category: 'EXAM',
        items: [
          {
            itemId: 'ITEM-1',
            name: 'Công khám chuyên khoa',
            quantity: 1,
            unitPrice: 120000,
            totalPrice: 120000,
            category: 'EXAM',
          },
        ],
        totalAmount: 120000,
        reconciliationStatus: 'RECONCILED',
        status: 'UNPAID',
      },
    ];

    const mockService: BillingApi = {
      listPendingBills: jest.fn().mockResolvedValue(serverBills),
      listTransactions: jest.fn().mockResolvedValue([]),
    };

    const { findByTestId, queryByText } = render(
      <PendingBillsListScreen service={mockService} />
    );

    const totalNode = await findByTestId('bill-total-BILL-EXAM-100');
    expect(String(totalNode.props.children)).toContain('120');
    // Confirm no hardcoded 200000 fallback is shown anywhere
    expect(queryByText(/200\.000|200,000|200000/)).toBeNull();
  });

  it('showsNoBillsWithoutMockAmount', async () => {
    const emptyService: BillingApi = {
      listPendingBills: jest.fn().mockResolvedValue([]),
      listTransactions: jest.fn().mockResolvedValue([]),
    };

    const { findByTestId, queryByText } = render(
      <PendingBillsListScreen service={emptyService} />
    );

    const emptyBanner = await findByTestId('bills-empty');
    expect(emptyBanner).toBeTruthy();
    expect(queryByText(/200\.000|200,000|200000/)).toBeNull();
  });

  it('hidesUnreconciledBalanceAndDisablesPayment', async () => {
    const unreconciledBills: PendingBill[] = [
      {
        billId: 'BILL-PRESCRIPTION-999',
        bookingCode: 'BK-999',
        bookingId: 'book-999',
        category: 'PRESCRIPTION',
        items: [
          {
            itemId: 'MED-1',
            name: 'Đơn thuốc ngoại trú',
            quantity: 1,
            unitPrice: 185000,
            totalPrice: 185000,
            category: 'PRESCRIPTION',
          },
        ],
        totalAmount: null,
        reconciliationStatus: 'UNRECONCILED',
        status: 'UNRECONCILED',
      },
    ];

    const mockService: BillingApi = {
      listPendingBills: jest.fn().mockResolvedValue(unreconciledBills),
      listTransactions: jest.fn().mockResolvedValue([]),
    };

    const { findByTestId, queryByTestId } = render(
      <PendingBillsListScreen service={mockService} />
    );

    const notice = await findByTestId(
      'bill-unreconciled-notice-BILL-PRESCRIPTION-999'
    );
    expect(notice.props.children).toBe('Đang đối soát; chưa thể thanh toán');
    expect(queryByTestId('bill-total-BILL-PRESCRIPTION-999')).toBeNull();

    const actionBtn = await findByTestId(
      'bill-checkout-action-BILL-PRESCRIPTION-999'
    );
    expect(actionBtn.props.disabled).toBe(true);
  });
});

