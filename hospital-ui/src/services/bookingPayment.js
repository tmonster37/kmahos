const payload = (response) => response?.data?.data || response?.data || response;

export async function createBookingPayment(http, booking) {
  if (!booking?.bookingCode || !Number.isFinite(Number(booking.price)) || Number(booking.price) <= 0) {
    throw new Error('Chưa có mã lịch khám hoặc viện phí hợp lệ từ máy chủ.');
  }
  return payload(await http.post('/api/payment/vietqr/create', null, {
    params: { bookingCode: booking.bookingCode, amount: booking.price, type: 'PAY_BOOKING' }
  }));
}

export async function getVerifiedPayment(http, order) {
  if (!order?.orderCode) return null;
  const payment = payload(await http.post(`/api/payment/payos/sync/${order.orderCode}`));
  return payment?.status === 'SUCCESS' && payment.isVerified === true
    && payment.orderCode === order.orderCode ? payment : null;
}
