import { describe, it, expect, vi } from 'vitest';
import { createBookingPayment, getVerifiedPayment } from '../services/bookingPayment';

describe('booking payment trust boundary', () => {
  it('uses the exact booking code and server price when creating a pending order', async () => {
    const http = { post: vi.fn().mockResolvedValue({ data: { txnRef: 'TNT123', status: 'PENDING' } }) };
    const result = await createBookingPayment(http, { bookingCode: 'KIOSK20261031ABC123', price: 234000 });
    expect(http.post).toHaveBeenCalledWith('/api/payment/vietqr/create', null, {
      params: { bookingCode: 'KIOSK20261031ABC123', amount: 234000, type: 'PAY_BOOKING' }
    });
    expect(result.status).toBe('PENDING');
  });

  it('does not create an order without the server booking and its price', async () => {
    const http = { post: vi.fn() };
    await expect(createBookingPayment(http, { bookingCode: 'BK123' })).rejects.toThrow();
    expect(http.post).not.toHaveBeenCalled();
  });

  it.each([
    { orderCode: 123, status: 'PENDING', isVerified: true },
    { orderCode: 123, status: 'SUCCESS', isVerified: false },
    { orderCode: 123, status: 'SUCCESS' },
    { orderCode: 456, status: 'SUCCESS', isVerified: true },
    { status: 'SUCCESS', isVerified: true }
  ])(
    'does not accept a client action or an unverified SUCCESS as payment', async (data) => {
      const http = { post: vi.fn().mockResolvedValue({ data }) };
      expect(await getVerifiedPayment(http, { orderCode: 123 })).toBeNull();
      expect(http.post).toHaveBeenCalledWith('/api/payment/payos/sync/123');
    }
  );

  it('accepts only server SUCCESS with verified payment and matching order', async () => {
    const data = { orderCode: 123, status: 'SUCCESS', isVerified: true };
    const http = { post: vi.fn().mockResolvedValue({ data }) };
    expect(await getVerifiedPayment(http, { orderCode: 123 })).toEqual(data);
    expect(await getVerifiedPayment(http, { orderCode: 456 })).toBeNull();
  });
});
