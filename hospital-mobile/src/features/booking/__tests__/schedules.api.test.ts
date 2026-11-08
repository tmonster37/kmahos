import { AxiosInstance } from 'axios';
import { createSchedulesApi } from '../schedules.api';
import { Schedule } from '../booking.types';

describe('schedules.api', () => {
  it('mapsDepartmentScheduleSlots', async () => {
    const serverSchedules: Schedule[] = [
      {
        scheduleId: 'sched-001',
        doctorId: 'doc-001',
        doctorName: 'BS. Nguyễn Văn M',
        degree: 'ThS.BS',
        departmentName: 'Khoa Nội Tổng Quát',
        roomId: 101,
        roomName: 'Phòng 101',
        scheduleDate: '2026-11-10',
        session: 'MORNING',
        timeSlots: [
          {
            timeSlotId: 'slot-0800',
            startTime: '08:00',
            endTime: '08:30',
            maxCapacity: 5,
            currentBookings: 2,
            isFull: false,
          },
        ],
      },
    ];

    const mockClient = {
      get: jest.fn().mockResolvedValue(serverSchedules),
    } as unknown as AxiosInstance;

    const api = createSchedulesApi(mockClient);
    const result = await api.listSchedules(1, '2026-11-10');

    expect(mockClient.get).toHaveBeenCalledWith('/api/schedules/by-department', {
      params: {
        departmentId: 1,
        date: '2026-11-10',
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0].doctorName).toBe('BS. Nguyễn Văn M');
    expect(result[0].timeSlots).toEqual([
      {
        timeSlotId: 'slot-0800',
        startTime: '08:00',
        endTime: '08:30',
        maxCapacity: 5,
        currentBookings: 2,
        isFull: false,
      },
    ]);
  });

  it('doesNotShowUnavailableSlots', async () => {
    const serverSchedules: Schedule[] = [
      {
        scheduleId: 'sched-002',
        doctorId: 'doc-002',
        doctorName: 'BS. Trần Thị N',
        degree: 'CKI',
        departmentName: 'Khoa Tim Mạch',
        roomId: 202,
        roomName: 'Phòng 202',
        scheduleDate: '2026-11-10',
        session: 'AFTERNOON',
        timeSlots: [
          {
            timeSlotId: 'slot-full-flag',
            startTime: '13:30',
            endTime: '14:00',
            maxCapacity: 5,
            currentBookings: 4,
            isFull: true,
          },
          {
            timeSlotId: 'slot-capacity-reached',
            startTime: '14:00',
            endTime: '14:30',
            maxCapacity: 5,
            currentBookings: 5,
            isFull: false,
          },
          {
            timeSlotId: 'slot-available',
            startTime: '14:30',
            endTime: '15:00',
            maxCapacity: 5,
            currentBookings: 1,
            isFull: false,
          },
        ],
      },
    ];

    const mockClient = {
      get: jest.fn().mockResolvedValue(serverSchedules),
    } as unknown as AxiosInstance;

    const api = createSchedulesApi(mockClient);
    const result = await api.listSchedules(2, '2026-11-10');

    expect(result[0].timeSlots.map((s) => s.timeSlotId)).toEqual(['slot-available']);
  });
});

