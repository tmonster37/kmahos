import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import PaymentQRModal from '../components/payment/PaymentQRModal';

// Render dialog content directly: the browser portal intentionally emits no server HTML.
vi.mock('@mui/material', async (original) => ({
  ...await original(), Dialog: ({ children }) => <section>{children}</section>
}));

describe('patient payment modal', () => {
  it('keeps only provider status sync and removes simulated transfer confirmation', () => {
    const html = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT123', orderCode: 123, amount: 150000, qrCode: '000201', status: 'PENDING'
    }} />);
    expect(html).not.toContain('Tôi đã chuyển khoản xong');
    expect(html).toContain('Đồng bộ từ PayOS');
    expect(html).toContain('Đang chờ nhận tiền');
  });
});
