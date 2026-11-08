import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
import { Booking, BookingCreateRequest } from './booking.types';

export interface BookingApi {
  createBooking(input: BookingCreateRequest): Promise<Booking>;
  listMyBookings(): Promise<Booking[]>;
  cancelBooking(bookingId: string): Promise<void>;
}

export function createBookingApi(client: AxiosInstance = apiClient): BookingApi {
  return {
    async createBooking(input: BookingCreateRequest): Promise<Booking> {
      const cleanProfileId = input.patientProfileId.trim();
      const cleanSlotId = input.timeSlotId.trim();
      const cleanReservationId = input.reservationId.trim();
      const cleanSymptoms = input.symptoms.trim();

      if (!cleanProfileId || !cleanSlotId || !cleanReservationId) {
        throw new Error('Thiếu thông tin hồ sơ, khung giờ hoặc mã giữ chỗ hợp lệ.');
      }
      if (!cleanSymptoms) {
        throw new Error('Vui lòng mô tả triệu chứng ban đầu.');
      }

      return (await client.post('/api/bookings', {
        patientProfileId: cleanProfileId,
        timeSlotId: cleanSlotId,
        symptoms: cleanSymptoms,
        reservationId: cleanReservationId,
      })) as unknown as Booking;
    },

    async listMyBookings(): Promise<Booking[]> {
      const data = (await client.get('/api/bookings/my-history')) as unknown as Booking[];
      return Array.isArray(data) ? data : [];
    },

    async cancelBooking(bookingId: string): Promise<void> {
      const cleanId = bookingId.trim();
      if (!cleanId) {
        throw new Error('Mã lịch khám không hợp lệ.');
      }
      await client.put(`/api/bookings/${encodeURIComponent(cleanId)}/cancel`);
    },
  };
}

export const bookingApi = createBookingApi();

