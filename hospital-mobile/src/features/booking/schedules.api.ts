import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
import { Schedule, TimeSlot } from './booking.types';

export interface SchedulesApi {
  listSchedules(departmentId: number, date: string): Promise<Schedule[]>;
}

export function getAvailableTimeSlots(schedule: Schedule): TimeSlot[] {
  if (!Array.isArray(schedule.timeSlots)) {
    return [];
  }
  return schedule.timeSlots.filter(
    (slot) => !slot.isFull && slot.currentBookings < slot.maxCapacity
  );
}

export function createSchedulesApi(client: AxiosInstance = apiClient): SchedulesApi {
  return {
    async listSchedules(departmentId: number, date: string): Promise<Schedule[]> {
      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        throw new Error('Mã chuyên khoa không hợp lệ.');
      }
      const trimmedDate = date.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        throw new Error('Ngày khám phải theo định dạng YYYY-MM-DD.');
      }

      const data = (await client.get('/api/schedules/by-department', {
        params: {
          departmentId,
          date: trimmedDate,
        },
      })) as unknown as Schedule[];

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((schedule) => ({
        ...schedule,
        timeSlots: getAvailableTimeSlots(schedule),
      }));
    },
  };
}

export const schedulesApi = createSchedulesApi();

