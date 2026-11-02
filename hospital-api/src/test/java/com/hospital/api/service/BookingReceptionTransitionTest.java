package com.hospital.api.service;

import com.hospital.api.constant.*;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.BookingReceptionTransition;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingReceptionTransitionTest {
    @Mock BookingRepository bookings;
    @Mock CounterTicketRepository tickets;
    @Mock CounterRepository counters;
    @Mock DoctorRepository doctors;
    @Mock DoctorScheduleRepository schedules;
    @Mock TimeSlotRepository slots;
    @Mock RoomRepository rooms;
    BookingReceptionTransition flow;
    Booking booking;
    List<CounterTicket> linked;
    LocalDate date = LocalDate.of(2026, 10, 23);
    Clock clock = Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    @BeforeEach void setUp() {
        flow = new BookingReceptionTransition(bookings, tickets, counters, doctors, schedules, slots, rooms, clock);
        Doctor doctor = Doctor.builder().doctorId(UUID.randomUUID()).department(Department.builder().departmentId(1).build()).build();
        DoctorSchedule schedule = DoctorSchedule.builder().doctorScheduleId(UUID.randomUUID()).doctor(doctor)
                .scheduleDate(date).room(Room.builder().roomId(10).build()).build();
        TimeSlot slot = TimeSlot.builder().timeSlotId(UUID.randomUUID()).doctorSchedule(schedule).currentBookings(1).holdingCount(0).maxCapacity(5).build();
        booking = Booking.builder().bookingId(UUID.randomUUID()).bookingCode("BK20261023ABC123").bookingDate(date).queueNumber(7)
                .price(BigDecimal.TEN).isPaid(false).status(BookingStatus.PENDING_PAYMENT).doctor(doctor).timeSlot(slot).build();
        linked = new ArrayList<>();
        lenient().when(tickets.findAllByBookingForUpdate(booking.getBookingId())).thenAnswer(i -> List.copyOf(linked));
        lenient().when(counters.findAllForKioskDispatchForUpdate(any(), any())).thenReturn(List.of(
                Counter.builder().counterId(1).counterType(CounterType.GENERAL).status(CounterStatus.OPEN).build()));
        lenient().when(tickets.saveAndFlush(any())).thenAnswer(i -> { CounterTicket t = i.getArgument(0); t.setTicketId(1L); linked.add(t); return t; });
    }
    @Test void unpaidCheckInRetriesHaveOneStableWaitingTicketAndTimestamp() {
        booking.setIsPriority(true);
        flow.checkIn(booking, CounterType.APPOINTMENT, false);
        LocalDateTime first = booking.getCheckedInAt();
        flow.checkIn(booking, CounterType.APPOINTMENT, false);
        assertEquals(first, booking.getCheckedInAt());
        assertFalse(booking.getIsPaid()); assertNull(booking.getDispatchedAt());
        assertEquals(1, linked.size());
        assertEquals("BOOKING:" + booking.getBookingId(), linked.get(0).getIdempotencyKey());
        assertEquals(CounterTicketStatus.WAITING, linked.get(0).getStatus());
        assertEquals(CounterType.PRIORITY, linked.get(0).getCounterType());
        verify(tickets).saveAndFlush(any());
    }
    @Test void paidAndFreeCheckInDispatchWithoutCreatingActiveTicketsOrChangingPaidFact() {
        booking.setPrice(BigDecimal.ZERO);
        flow.checkIn(booking, CounterType.APPOINTMENT, false);
        assertFalse(booking.getIsPaid()); assertNotNull(booking.getDispatchedAt());
        LocalDateTime dispatched = booking.getDispatchedAt();
        flow.checkIn(booking, CounterType.APPOINTMENT, false);
        assertEquals(dispatched, booking.getDispatchedAt());
        verify(tickets, never()).saveAndFlush(any());
    }
    @Test void paymentBeforeArrivalDoesNotDispatchOrInventCheckIn() {
        booking.setIsPaid(true);
        flow.afterVerifiedPayment(booking);
        assertNull(booking.getCheckedInAt()); assertNull(booking.getDispatchedAt());
        verifyNoInteractions(tickets);
    }

    @Test void reconciliationOfAnUnpaidArrivalLeavesItsTicketWaiting() {
        flow.checkIn(booking, CounterType.GENERAL, false);
        flow.afterVerifiedPayment(booking);
        assertEquals(CounterTicketStatus.WAITING, linked.get(0).getStatus());
        assertNull(booking.getDispatchedAt()); assertFalse(booking.getIsPaid());
    }
    @Test void verifiedPaymentFinishesWaitingAndCallingTicketsAndDispatchesOnce() {
        flow.checkIn(booking, CounterType.APPOINTMENT, false);
        CounterTicket waiting = linked.get(0);
        waiting.setQueueNumber(3);
        CounterTicket calling = CounterTicket.builder().ticketId(2L).booking(booking).status(CounterTicketStatus.CALLING).build();
        linked.add(calling);
        booking.setIsPaid(true);
        flow.afterVerifiedPayment(booking);
        LocalDateTime dispatched = booking.getDispatchedAt();
        flow.afterVerifiedPayment(booking);
        assertEquals(dispatched, booking.getDispatchedAt());
        assertEquals(CounterTicketStatus.SERVED, waiting.getStatus());
        assertEquals(CounterTicketStatus.SERVED, calling.getStatus());
        assertEquals(10, waiting.getDispatchedRoomId());
        assertNotNull(waiting.getServedAt()); assertEquals(7, booking.getQueueNumber());
        verify(tickets).save(waiting); verify(tickets).save(calling);
    }
    @Test void unpaidCannotBeDispatchedEvenWithPriorityOrConfirmedStatus() {
        booking.setStatus(BookingStatus.CONFIRMED); booking.setIsPriority(true);
        assertThrows(AppException.class, () -> flow.dispatchTo(booking, null, null, null));
        assertNull(booking.getDispatchedAt()); verify(tickets, never()).save(any());
    }

    @Test void checkInRetryPreservesAnIntentionallySkippedTicket() {
        CounterTicket skipped = CounterTicket.builder().booking(booking).idempotencyKey("BOOKING:"+booking.getBookingId())
                .status(CounterTicketStatus.SKIPPED).queueNumber(3).build(); linked.add(skipped);
        AppException error = assertThrows(AppException.class, () -> flow.checkIn(booking, CounterType.APPOINTMENT, false));
        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getStatus());
        assertEquals(CounterTicketStatus.SKIPPED, skipped.getStatus());
        assertEquals(1, linked.size()); verify(tickets, never()).saveAndFlush(any());
        verify(tickets, never()).save(any());
        assertNull(booking.getDispatchedAt()); assertFalse(booking.getIsPaid());
    }
    @Test void missingArrivalAndInvalidRoomFailBeforeDispatch() {
        booking.setIsPaid(true);
        assertThrows(AppException.class, () -> flow.dispatchCheckedIn(booking));
        when(schedules.findAllByScheduleDateAndDeletedFalse(date)).thenReturn(List.of());
        assertThrows(AppException.class, () -> flow.dispatchTo(booking, 999, null, null));
        assertNull(booking.getDispatchedAt());
    }
    @Test void numberingLocksDoctorAndUsesMaxAcrossAllSlots() {
        when(doctors.findByIdForUpdate(booking.getDoctor().getDoctorId())).thenReturn(Optional.of(booking.getDoctor()));
        when(bookings.findMaxQueueNumber(booking.getDoctor().getDoctorId(), date)).thenReturn(12);
        assertEquals(13, flow.nextQueueNumber(booking.getDoctor(), date));
        var order = inOrder(doctors, bookings);
        order.verify(doctors).findByIdForUpdate(booking.getDoctor().getDoctorId());
        order.verify(bookings).findMaxQueueNumber(booking.getDoctor().getDoctorId(), date);
    }

    @Test void freeKioskReceiptKeepsPaidFalseAndExposesDoctorNumberSeparately() {
        booking.setPrice(BigDecimal.ZERO);
        flow.checkIn(booking, CounterType.GENERAL, false);
        CounterTicket ticket = flow.ensureTicket(booking, CounterType.GENERAL, false);
        var response = com.hospital.api.dto.response.CounterTicketResponse.fromEntity(ticket, 0);
        assertEquals(CounterTicketStatus.SERVED, response.status());
        assertFalse(response.isPaid()); assertEquals(BigDecimal.ZERO, response.price());
        assertEquals(7, response.bookingQueueNumber()); assertEquals("KB-07", response.bookingQueueCode());
        assertEquals(1, response.queueNumber()); assertNotNull(response.dispatchedAt());
    }

    @Test void roomDoctorReassignmentMovesCapacityAndPersistsBookingRelationsAndTicketRoom() {
        booking.setIsPaid(true);
        TimeSlot old = booking.getTimeSlot();
        Doctor doctor = Doctor.builder().doctorId(UUID.randomUUID()).department(booking.getDoctor().getDepartment()).build();
        DoctorSchedule schedule = DoctorSchedule.builder().doctorScheduleId(UUID.randomUUID()).doctor(doctor).scheduleDate(date)
                .room(Room.builder().roomId(20).build()).build();
        TimeSlot target = TimeSlot.builder().timeSlotId(UUID.randomUUID()).doctorSchedule(schedule).endTime(LocalTime.of(11,0))
                .currentBookings(0).holdingCount(0).maxCapacity(1).build();
        when(schedules.findAllByScheduleDateAndDeletedFalse(date)).thenReturn(List.of(schedule));
        when(slots.findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(schedule.getDoctorScheduleId())).thenReturn(List.of(target));
        when(slots.findByIdWithLock(old.getTimeSlotId())).thenReturn(Optional.of(old));
        when(slots.findByIdWithLock(target.getTimeSlotId())).thenReturn(Optional.of(target));
        when(doctors.findByIdForUpdate(doctor.getDoctorId())).thenReturn(Optional.of(doctor));
        when(bookings.findMaxQueueNumber(doctor.getDoctorId(), date)).thenReturn(12);
        var ticket = CounterTicket.builder().booking(booking).status(CounterTicketStatus.WAITING).build(); linked.add(ticket);
        flow.dispatchTo(booking, 20, null, doctor.getDoctorId());
        flow.dispatchTo(booking, 20, null, doctor.getDoctorId());
        assertEquals(target, booking.getTimeSlot()); assertEquals(doctor, booking.getDoctor());
        assertEquals(13, booking.getQueueNumber()); assertEquals(20, ticket.getDispatchedRoomId());
        assertEquals(0, old.getCurrentBookings()); assertEquals(1, target.getCurrentBookings());
        verify(slots).save(target); verify(slots).save(old);
    }
}
