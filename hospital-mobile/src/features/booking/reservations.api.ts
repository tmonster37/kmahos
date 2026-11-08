import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
import { SlotReservation } from './booking.types';

export interface ReservationsApi {
  reserveSlot(timeSlotId: string, patientProfileId: string): Promise<SlotReservation>;
  releaseSlot(reservationId: string): Promise<void>;
}

export function createReservationsApi(client: AxiosInstance = apiClient): ReservationsApi {
  return {
    async reserveSlot(timeSlotId: string, patientProfileId: string): Promise<SlotReservation> {
      const cleanSlotId = timeSlotId.trim();
      const cleanProfileId = patientProfileId.trim();
      if (!cleanSlotId || !cleanProfileId) {
        throw new Error('Vui lòng chọn khung giờ và hồ sơ bệnh nhân hợp lệ.');
      }
      return (await client.post('/api/bookings/reserve-slot', {
        timeSlotId: cleanSlotId,
        patientProfileId: cleanProfileId,
      })) as unknown as SlotReservation;
    },

    async releaseSlot(reservationId: string): Promise<void> {
      const cleanId = reservationId.trim();
      if (!cleanId) {
        return;
      }
      await client.post(`/api/bookings/release-slot/${encodeURIComponent(cleanId)}`);
    },
  };
}

export const reservationsApi = createReservationsApi();

