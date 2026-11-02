import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import MedicalBillsPage from '../pages/patient/MedicalBillsPage';
import axiosInstance from '../services/AxiosInstance';

// Exercise the page's actual bill button handler without a browser or loading effects.
vi.mock('react', async (original) => ({
  ...await original(), useState: vi.fn(), useEffect: vi.fn()
}));
vi.mock('../services/AxiosInstance', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

const findPaymentButtons = (node) => {
  if (Array.isArray(node)) return node.flatMap(findPaymentButtons);
  if (!node || typeof node !== 'object') return [];
  if (node.props?.children === 'PayOS' && typeof node.props?.onClick === 'function') return [node];
  return findPaymentButtons(node.props?.children);
};

describe('medical bill payment request', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['BK20261031ABC123', 'BK20261031A+B&?/ #'])(
    'sends the selected exact booking code safely with its server-provided price: %s', async (bookingCode) => {
      const firstBill = { bookingId: 'first', bookingCode: 'BK20261031FIRST1', price: 111111 };
      const selectedBill = { bookingId: 'selected', bookingCode, price: 234567 };
      const setSelectedBill = vi.fn();
      const states = [0, [firstBill, selectedBill], false, '', null, false, null, false];
      let stateIndex = 0;
      useState.mockImplementation(() => {
        const index = stateIndex++;
        return [states[index], index === 4 ? setSelectedBill : vi.fn()];
      });
      axiosInstance.post.mockResolvedValue({ data: { qrImageUrl: '/qr.png', orderCode: 123, status: 'PENDING' } });

      const buttons = findPaymentButtons(MedicalBillsPage());
      expect(buttons).toHaveLength(2);
      await buttons[1].props.onClick();

      expect(setSelectedBill).toHaveBeenCalledWith(selectedBill);
      expect(axiosInstance.post).toHaveBeenCalledOnce();
      const request = new URL(axiosInstance.post.mock.calls[0][0], 'https://hospital.example');
      expect(request.pathname).toBe('/api/payment/vietqr/create');
      expect(request.searchParams.get('type')).toBe('PAY_BOOKING');
      expect(request.searchParams.get('amount')).toBe('234567');
      expect(request.searchParams.get('bookingCode')).toBe(bookingCode);
      expect(request.searchParams.size).toBe(3);
    }
  );
});
