import React from 'react';
import { AxiosInstance } from 'axios';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { createBookingApi } from '../booking.api';
import { Booking } from '../booking.types';
import { BookingJourney } from '../components/BookingJourney';
import AppointmentsListScreen from '@/app/(patient)/appointments/index';
import AppointmentDetailScreen from '@/app/(patient)/appointments/[bookingId]';
import { ApiClientError } from '@/lib/api/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ bookingId: 'book-001' }),
}));

describe('booking.api & BookingJourney', () => {
  it('createBookingUsesOwnedProfileAndReservation', async () => {
    const createdBooking: Booking = {
      bookingId: 'book-101',
      bookingCode: 'BK-2026-101',
      patientProfileId: 'prof-owned-1',
      patientName: 'Nguyễn Văn A',
      doctorName: 'BS. Lê Thị B',
      departmentName: 'Khoa Nội Tổng Quát',
      bookingDate: '2026-11-12',
      startTime: '09:00',
      endTime: '09:30',
      status: 'PENDING_PAYMENT',
    };

    const mockClient = {
      post: jest.fn().mockResolvedValue(createdBooking),
    } as unknown as AxiosInstance;

    const api = createBookingApi(mockClient);
    const result = await api.createBooking({
      patientProfileId: 'prof-owned-1',
      timeSlotId: 'slot-0900',
      symptoms: 'Đau đầu nhẹ, mệt mỏi',
      reservationId: 'res-555',
    });

    expect(mockClient.post).toHaveBeenCalledWith('/api/bookings', {
      patientProfileId: 'prof-owned-1',
      timeSlotId: 'slot-0900',
      symptoms: 'Đau đầu nhẹ, mệt mỏi',
      reservationId: 'res-555',
    });
    expect(result.bookingId).toBe('book-101');
  });

  it('cancelRequiresBookingOwner', async () => {
    const mockClient = {
      put: jest
        .fn()
        .mockRejectedValue(
          new ApiClientError('Bạn không có quyền hủy lịch khám của tài khoản khác.', 403)
        ),
    } as unknown as AxiosInstance;

    const api = createBookingApi(mockClient);

    await expect(api.cancelBooking('book-foreign-999')).rejects.toMatchObject({
      status: 403,
      message: 'Bạn không có quyền hủy lịch khám của tài khoản khác.',
    });
    expect(mockClient.put).toHaveBeenCalledWith('/api/bookings/book-foreign-999/cancel');
  });

  it('showsBookingHistory', async () => {
    const serverBookings: Booking[] = [
      {
        bookingId: 'book-001',
        bookingCode: 'BK-001',
        patientProfileId: 'prof-1',
        patientName: 'Phạm Văn H',
        doctorName: 'BS. Trần C',
        departmentName: 'Khoa Nội Tổng Quát',
        bookingDate: '2026-11-10',
        startTime: '08:00',
        endTime: '08:30',
        status: 'CONFIRMED',
      },
    ];

    const mockService = {
      createBooking: jest.fn(),
      listMyBookings: jest.fn().mockResolvedValue(serverBookings),
      cancelBooking: jest.fn().mockResolvedValue(undefined),
    };

    const { findByTestId, getByText } = render(
      React.createElement(AppointmentsListScreen, { api: mockService })
    );

    const card = await findByTestId('appointment-card-book-001');
    expect(card).toBeTruthy();
    expect(getByText('BK-001')).toBeTruthy();

    const detail = render(
      React.createElement(AppointmentDetailScreen, {
        api: mockService,
        bookingIdOverride: 'book-001',
      })
    );

    const cancelTrigger = await detail.findByTestId('appointment-cancel-trigger');
    fireEvent.press(cancelTrigger);

    const confirmYes = await detail.findByTestId('appointment-cancel-confirm-yes');
    fireEvent.press(confirmYes);

    await waitFor(() => {
      expect(mockService.cancelBooking).toHaveBeenCalledWith('book-001');
      expect(mockService.listMyBookings).toHaveBeenCalledTimes(3);
    });
  });

  it('doesNotInferMissingJourneyFields', () => {
    const minimalBooking: Booking = {
      bookingId: 'book-minimal',
      bookingCode: 'BK-MIN',
      patientProfileId: 'prof-1',
      patientName: 'Nguyễn Văn A',
      doctorName: 'BS. Lê B',
      departmentName: 'Khoa Nội Tổng Quát',
      bookingDate: '2026-11-10',
      status: 'PENDING_PAYMENT',
    };

    const { getByTestId } = render(
      React.createElement(BookingJourney, { booking: minimalBooking })
    );

    expect(getByTestId('journey-booking-status').props.children).toBe('PENDING_PAYMENT');
    expect(getByTestId('journey-payment-status').props.children).toBe('Chưa có dữ liệu');
    expect(getByTestId('journey-queue-code').props.children).toBe('Chưa có dữ liệu');
    expect(getByTestId('journey-counter-ticket').props.children).toBe('Chưa có dữ liệu');
    expect(getByTestId('journey-checked-in-at').props.children).toBe('Chưa có dữ liệu');
    expect(getByTestId('journey-dispatched-at').props.children).toBe('Chưa có dữ liệu');
    expect(getByTestId('journey-room-name').props.children).toBe('Chưa có dữ liệu');
  });
});
