import { AxiosInstance } from 'axios';
import { createPaymentApi, parsePaymentReturnParams } from '../payment.api';
import { ApiClientError } from '@/lib/api/types';

describe('payment.api', () => {
  it('createsLinkWithBillIdOnly and usesCanonicalServerBalance', async () => {
    const serverGatewayResponse = {
      transactionId: 'txn-canonical-001',
      txnRef: 'PAYOS-CANONICAL-001',
      paymentMethod: 'PAYOS',
      transactionType: 'MEDICAL_TEST_PAYMENT',
      amount: 240000,
      status: 'PENDING',
      qrImageUrl: 'https://img.vietqr.io/image/970422-123456-compact2.png',
      qrCode: '00020101021238570010A000000727',
      paymentUrl: 'https://pay.payos.vn/web/canonical-001',
      bankName: 'MBBank',
      bankAccountNo: '0123456789',
      accountHolder: 'BENH VIEN DA KHOA',
      transferContent: 'TT BK2026001 TEST',
      description: 'Thanh toan can lam sang [CAT:TEST]',
      orderCode: 123456789,
    };

    const mockClient = {
      post: jest.fn().mockResolvedValue(serverGatewayResponse),
    } as unknown as AxiosInstance;

    const api = createPaymentApi(mockClient);
    const result = await api.createPaymentLink(
      'BILL-TEST-11111111-1111-1111-1111-111111111111'
    );

    // Must send ONLY { billId } — no client-supplied amount, type, or description
    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/payment/patient/payos/create-link',
      {
        billId: 'BILL-TEST-11111111-1111-1111-1111-111111111111',
      }
    );
    expect(result.amount).toBe(240000);
    expect(result.paymentUrl).toBe('https://pay.payos.vn/web/canonical-001');
  });

  it('wrongAccountStatusIsRejected', async () => {
    const mockClient = {
      get: jest
        .fn()
        .mockRejectedValue(
          new ApiClientError(
            'Bạn không có quyền xem trạng thái giao dịch của tài khoản khác.',
            403
          )
        ),
    } as unknown as AxiosInstance;

    const api = createPaymentApi(mockClient);

    await expect(api.checkPaymentStatus('FOREIGN-TXN-999')).rejects.toMatchObject({
      status: 403,
      message: 'Bạn không có quyền xem trạng thái giao dịch của tài khoản khác.',
    });
  });

  it('strips unexpected parameters from payment return params', () => {
    const parsed = parsePaymentReturnParams({
      txnRef: 'PAYOS-TXN-123',
      orderCode: '555666',
      cancel: 'true',
      accessToken: 'leaked-jwt-should-be-ignored',
      patientProfileId: 'should-be-ignored',
    });

    expect(parsed).toEqual({
      txnRef: 'PAYOS-TXN-123',
      orderCode: 555666,
      providerCancelled: true,
    });
    expect((parsed as unknown as Record<string, unknown>).accessToken).toBeUndefined();
  });
});

