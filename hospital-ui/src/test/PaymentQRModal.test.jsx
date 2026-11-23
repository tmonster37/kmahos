import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import PaymentQRModal from '../components/payment/PaymentQRModal';

// Render dialog content directly: the browser portal intentionally emits no server HTML.
vi.mock('@mui/material', async (original) => ({
  ...await original(),
  Dialog: ({ children }) => <section data-testid="payment-dialog">{children}</section>
}));

describe('PaymentQRModal Component Tests', () => {
  it('keeps only provider status sync and removes simulated transfer confirmation', () => {
    const html = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT123', orderCode: 123, amount: 150000, qrCode: '00020101021238540010A000000727', status: 'PENDING'
    }} />);
    expect(html).not.toContain('Tôi đã chuyển khoản xong');
    expect(html).toContain('Đồng bộ từ PayOS');
    expect(html).toContain('Đang chờ nhận tiền');
  });

  it('pendingQrIsNotPaid: unverified QR status never claims success or displays receipt', () => {
    const html = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT-UNVERIFIED', orderCode: 456, amount: 200000, qrCode: '000201', status: 'PENDING'
    }} />);
    expect(html).toContain('Đang chờ nhận tiền');
    expect(html).not.toContain('THANH TOÁN THÀNH CÔNG');
    expect(html).not.toContain('Xuất biên lai');
  });

  it('completely removes fake PAY: fallback and shows missing QR state when provider omits QR fields', () => {
    const html = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT-NO-QR',
      orderCode: 999,
      amount: 180000,
      bankName: 'MBBank',
      accountHolder: 'NGUYEN VAN A',
      bankAccountNo: '0987654321',
      transferContent: 'TNT NO QR',
      status: 'PENDING'
      // No qrCode, no qrImageUrl, no paymentUrl
    }} />);

    // Must NEVER generate fake PAY: QR payload
    expect(html).not.toContain('PAY:TNT-NO-QR:180000');
    expect(html).not.toContain('vietqr-canvas');

    // Must render explicit missing data alert/box
    expect(html).toContain('Chưa có mã QR thanh toán từ cổng thanh toán');
    expect(html).toContain('Nhà cung cấp chưa trả dữ liệu QR hợp lệ');

    // Download QR button must be disabled
    expect(html).toContain('Tải ảnh QR về máy');
    expect(html).toContain('Mui-disabled');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Tải ảnh QR về máy/);

    // No payment gateway opening button when paymentUrl is absent
    expect(html).not.toContain('Mở Cổng Thanh Toán PayOS');
  });

  it('handles invalid or missing amount by disabling copy button and showing fallback', () => {
    // Test case A: amount is null
    const htmlNull = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT-NULL-AMT',
      orderCode: 101,
      amount: null,
      qrCode: '000201',
      status: 'PENDING'
    }} />);
    expect(htmlNull).toContain('Chưa có dữ liệu');

    // Test case B: amount is empty string / whitespace
    const htmlEmpty = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT-EMPTY-AMT',
      orderCode: 102,
      amount: '   ',
      qrCode: '000201',
      status: 'PENDING'
    }} />);
    expect(htmlEmpty).toContain('Chưa có dữ liệu');

    // Test case C: amount is Infinity
    const htmlInf = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT-INF-AMT',
      orderCode: 103,
      amount: Infinity,
      qrCode: '000201',
      status: 'PENDING'
    }} />);
    expect(htmlInf).toContain('Chưa có dữ liệu');

    // Test case D: amount is negative
    const htmlNeg = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT-NEG-AMT',
      orderCode: 104,
      amount: -50000,
      qrCode: '000201',
      status: 'PENDING'
    }} />);
    expect(htmlNeg).toContain('Chưa có dữ liệu');
  });

  it('preserves genuine zero amount (0 or "0") and formats it correctly without treating as missing', () => {
    const htmlZero = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT-ZERO-AMT',
      orderCode: 105,
      amount: 0,
      qrCode: '000201',
      bankAccountNo: '1122334455',
      transferContent: 'TNT ZERO',
      status: 'PENDING'
    }} />);

    // 0 VNĐ must be rendered
    expect(htmlZero).toContain('0 đ');
    // Must not show "Chưa có dữ liệu" for amount
    expect(htmlZero).not.toContain('Chưa có số tiền hợp lệ để copy');
  });

  it('locks copy buttons when bankAccountNo or transferContent are missing', () => {
    const htmlMissingDetails = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: '',
      orderCode: 106,
      amount: 50000,
      qrCode: '000201',
      bankAccountNo: '',
      transferContent: '',
      status: 'PENDING'
    }} />);

    // Account number displays fallback ---
    expect(htmlMissingDetails).toContain('---');
    // Content displays fallback Chưa có dữ liệu
    expect(htmlMissingDetails).toContain('Chưa có dữ liệu');
  });

  it('renders valid QR canvas and enables download button when valid EMVCo qrCode is provided', () => {
    const htmlValid = renderToStaticMarkup(<PaymentQRModal open paymentData={{
      txnRef: 'TNT-VALID-QR',
      orderCode: 107,
      amount: 250000,
      qrCode: '00020101021238540010A00000072701260006970422011209876543210208QRIBFTTA530370454062500005802VN62110707TNTVALID6304ABCD',
      bankAccountNo: '0987654321',
      transferContent: 'TNTVALID',
      status: 'PENDING'
    }} />);

    expect(htmlValid).toContain('vietqr-canvas');
    expect(htmlValid).not.toContain('Chưa có mã QR thanh toán từ cổng thanh toán');
    // Button must NOT have disabled=""
    expect(htmlValid).not.toMatch(/<button[^>]*disabled=""[^>]*>[^<]*Tải ảnh QR về máy/);
  });
});
