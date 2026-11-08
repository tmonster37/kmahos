import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaymentCheckout } from '../components/PaymentCheckout';
import PaymentReturnScreen from '@/app/(patient)/payment/return';
import { PendingBill } from '../billing.types';
import { PaymentApi } from '../payment.api';
import { ApiClientError } from '@/lib/api/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

describe('PaymentCheckout & PaymentReturnScreen', () => {
  const reconciledBill: PendingBill = {
    billId: 'BILL-EXAM-11111111-1111-1111-1111-111111111111',
    bookingCode: 'BK-2026-101',
    bookingId: '11111111-1111-1111-1111-111111111111',
    category: 'EXAM',
    items: [
      {
        itemId: 'EXAM-1',
        name: 'Khám Nội Tổng Quát',
        quantity: 1,
        unitPrice: 120000,
        totalPrice: 120000,
        category: 'EXAM',
      },
    ],
    totalAmount: 120000,
    reconciliationStatus: 'RECONCILED',
    status: 'UNPAID',
  };

  it('rendersServerIssuedVietQRDetails and opensPayOSCheckoutUrlFromResponse', async () => {
    const openBrowserMock = jest.fn().mockResolvedValue({ type: 'opened' });
    const onNavigateToReturn = jest.fn();

    const mockPaymentService: PaymentApi = {
      createPaymentLink: jest.fn().mockResolvedValue({
        transactionId: 'txn-101',
        txnRef: 'PAYOS-101',
        paymentMethod: 'PAYOS',
        transactionType: 'BOOKING_PAYMENT',
        amount: 120000,
        status: 'PENDING',
        qrImageUrl: 'https://img.vietqr.io/image/payos-101.png',
        qrCode: '0002010102123857',
        paymentUrl: 'https://pay.payos.vn/web/checkout-101',
        bankName: 'MBBank',
        bankAccountNo: '0999888777',
        accountHolder: 'BENH VIEN DA KHOA',
        transferContent: 'TT BK2026101 EXAM',
        orderCode: 101202,
      }),
      checkPaymentStatus: jest.fn(),
      syncPayOS: jest.fn(),
    };

    const { findByTestId, getByTestId } = render(
      <PaymentCheckout
        bill={reconciledBill}
        paymentService={mockPaymentService}
        openBrowser={openBrowserMock}
        onNavigateToReturn={onNavigateToReturn}
      />
    );

    fireEvent.press(getByTestId('start-payos-checkout-button'));

    await findByTestId('checkout-gateway-details');
    expect(mockPaymentService.createPaymentLink).toHaveBeenCalledWith(
      'BILL-EXAM-11111111-1111-1111-1111-111111111111'
    );
    expect(getByTestId('checkout-gateway-bank').props.children).toContain('MBBank');
    expect(getByTestId('checkout-gateway-account-no').props.children).toContain(
      '0999888777'
    );
    expect(getByTestId('checkout-gateway-transfer-content').props.children).toContain(
      'TT BK2026101 EXAM'
    );
    expect(getByTestId('checkout-gateway-qr-code').props.children).toContain(
      '0002010102123857'
    );

    fireEvent.press(getByTestId('open-payos-browser-button'));

    await waitFor(() => {
      expect(openBrowserMock).toHaveBeenCalledWith(
        'https://pay.payos.vn/web/checkout-101'
      );
      expect(onNavigateToReturn).toHaveBeenCalledWith({
        txnRef: 'PAYOS-101',
        orderCode: 101202,
      });
    });
  });

  it('unreconciledCheckoutFailsClosed', () => {
    const unreconciledBill: PendingBill = {
      ...reconciledBill,
      billId: 'BILL-TEST-UNRECONCILED',
      totalAmount: null,
      reconciliationStatus: 'UNRECONCILED',
      status: 'UNRECONCILED',
    };

    const mockPaymentService: PaymentApi = {
      createPaymentLink: jest.fn(),
      checkPaymentStatus: jest.fn(),
      syncPayOS: jest.fn(),
    };

    const { getByTestId, queryByTestId } = render(
      <PaymentCheckout
        bill={unreconciledBill}
        paymentService={mockPaymentService}
      />
    );

    expect(getByTestId('checkout-unreconciled-blocked')).toBeTruthy();
    expect(queryByTestId('start-payos-checkout-button')).toBeNull();
    expect(mockPaymentService.createPaymentLink).not.toHaveBeenCalled();
  });

  it('providerCancelDoesNotMarkPaid', async () => {
    const mockPaymentService: PaymentApi = {
      createPaymentLink: jest.fn(),
      checkPaymentStatus: jest.fn().mockResolvedValue({
        transactionId: 'txn-cancel-1',
        amount: 120000,
        transactionType: 'BOOKING_PAYMENT',
        paymentMethod: 'PAYOS',
        status: 'CANCELLED',
      }),
      syncPayOS: jest.fn().mockResolvedValue({
        transactionId: 'txn-cancel-1',
        amount: 120000,
        transactionType: 'BOOKING_PAYMENT',
        paymentMethod: 'PAYOS',
        status: 'CANCELLED',
      }),
    };

    const { findByTestId, queryByText } = render(
      <PaymentReturnScreen
        paramsOverride={{ txnRef: 'PAYOS-CANCEL-1', orderCode: '777888', cancel: 'true' }}
        service={mockPaymentService}
      />
    );

    const headline = await findByTestId('payment-result-headline');
    expect(headline.props.children).toBe('Giao dịch đã hủy');
    expect(queryByText('Đã thanh toán')).toBeNull();
  });

  it('syncSuccessShowsPaid', async () => {
    const mockPaymentService: PaymentApi = {
      createPaymentLink: jest.fn(),
      checkPaymentStatus: jest.fn(),
      syncPayOS: jest.fn().mockResolvedValue({
        transactionId: 'txn-paid-1',
        amount: 120000,
        transactionType: 'BOOKING_PAYMENT',
        paymentMethod: 'PAYOS',
        status: 'SUCCESS',
        orderCode: 999111,
        isVerified: true,
      }),
    };

    const { findByTestId } = render(
      <PaymentReturnScreen
        paramsOverride={{ txnRef: 'PAYOS-PAID-1', orderCode: '999111' }}
        service={mockPaymentService}
      />
    );

    const headline = await findByTestId('payment-result-headline');
    expect(headline.props.children).toBe('Đã thanh toán');
    expect(mockPaymentService.syncPayOS).toHaveBeenCalledWith(999111);
  });

  it('pendingStatusRemainsPending', async () => {
    const mockPaymentService: PaymentApi = {
      createPaymentLink: jest.fn(),
      checkPaymentStatus: jest.fn().mockResolvedValue({
        transactionId: 'txn-pend-1',
        amount: 120000,
        transactionType: 'BOOKING_PAYMENT',
        paymentMethod: 'PAYOS',
        status: 'PENDING',
      }),
      syncPayOS: jest.fn().mockResolvedValue({
        transactionId: 'txn-pend-1',
        amount: 120000,
        transactionType: 'BOOKING_PAYMENT',
        paymentMethod: 'PAYOS',
        status: 'PENDING',
      }),
    };

    const { findByTestId, queryByText } = render(
      <PaymentReturnScreen
        paramsOverride={{ txnRef: 'PAYOS-PEND-1', orderCode: '333444' }}
        service={mockPaymentService}
      />
    );

    const headline = await findByTestId('payment-result-headline');
    expect(headline.props.children).toBe('Đang chờ xác nhận từ hệ thống');
    expect(queryByText('Đã thanh toán')).toBeNull();
  });

  it('wrongAccountStatusIsRejected on return screen', async () => {
    const mockPaymentService: PaymentApi = {
      createPaymentLink: jest.fn(),
      checkPaymentStatus: jest
        .fn()
        .mockRejectedValue(
          new ApiClientError('Không có quyền truy cập giao dịch này.', 403)
        ),
      syncPayOS: jest.fn(),
    };

    const { findByTestId, queryByText } = render(
      <PaymentReturnScreen
        paramsOverride={{ txnRef: 'FOREIGN-TXN-001' }}
        service={mockPaymentService}
      />
    );

    const errorCard = await findByTestId('payment-result-error');
    expect(errorCard).toBeTruthy();
    expect(queryByText('Đã thanh toán')).toBeNull();
  });
});

