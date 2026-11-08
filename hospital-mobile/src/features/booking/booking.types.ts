export type ScheduleSession = 'MORNING' | 'AFTERNOON' | string;

export interface Department {
  departmentId: number;
  departmentName: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  totalRooms?: number;
  isActive?: boolean;
}

export interface TimeSlot {
  timeSlotId: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  currentBookings: number;
  isFull: boolean;
}

export interface Schedule {
  scheduleId: string;
  doctorId: string;
  doctorName: string;
  degree?: string | null;
  departmentName?: string | null;
  roomId?: number | null;
  roomName?: string | null;
  scheduleDate: string;
  session: ScheduleSession;
  timeSlots: TimeSlot[];
}

export interface ReserveSlotRequest {
  timeSlotId: string;
  patientProfileId: string;
}

export interface SlotReservation {
  reservationId: string;
  timeSlotId: string;
  expiresAt: string;
  ttlSeconds: number;
  message?: string;
}

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'WAITING_EXAM'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

export interface BookingCreateRequest {
  patientProfileId: string;
  timeSlotId: string;
  symptoms: string;
  reservationId: string;
}

export interface Booking {
  bookingId: string;
  bookingCode: string;
  queueNumber?: number | null;
  queueCode?: string | null;
  isPriority?: boolean | null;
  priorityReason?: string | null;
  bookingDate: string;
  startTime?: string | null;
  endTime?: string | null;
  patientName: string;
  doctorName: string;
  departmentName: string;
  roomName?: string | null;
  price?: number | null;
  status: BookingStatus;
  symptoms?: string | null;
  patientProfileId?: string | null;
  patientPhone?: string | null;
  patientDob?: string | null;
  patientGender?: string | null;
  identityNumber?: string | null;
  isPaid?: boolean | null;
  checkedInAt?: string | null;
  dispatchedAt?: string | null;
  counterTicketCode?: string | null;
  counterQueueNumber?: number | null;
  counterName?: string | null;
}

