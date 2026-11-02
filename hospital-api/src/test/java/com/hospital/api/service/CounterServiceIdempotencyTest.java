package com.hospital.api.service;

import com.hospital.api.constant.CounterTicketStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.dto.request.KioskDispatchRequest;
import com.hospital.api.dto.response.CounterTicketResponse;
import com.hospital.api.entity.Counter;
import com.hospital.api.entity.CounterTicket;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.CounterAssignmentRepository;
import com.hospital.api.repository.CounterRepository;
import com.hospital.api.repository.CounterTicketRepository;
import com.hospital.api.repository.RoomRepository;
import com.hospital.api.service.impl.CounterServiceImpl;
import com.hospital.api.service.impl.KioskDispatchTransactionService;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CounterServiceIdempotencyTest {

    @Test
    void counterActionsCannotReopenATicketCompletedWhileWaitingForItsBookingLock() {
        var counters = mock(CounterRepository.class);
        var tickets = mock(CounterTicketRepository.class);
        var bookings = mock(BookingRepository.class);
        var reception = mock(com.hospital.api.service.impl.BookingReceptionTransition.class);
        var bookingId = java.util.UUID.randomUUID();
        var link = mock(CounterTicketRepository.TicketLink.class);
        when(link.getBookingId()).thenReturn(bookingId); when(link.getCounterId()).thenReturn(1); when(link.getTicketId()).thenReturn(10L);
        when(tickets.findLinkById(10L)).thenReturn(Optional.of(link));
        when(tickets.findWaitingTicketLinks(eq(1), org.mockito.ArgumentMatchers.any(), eq(CounterTicketStatus.WAITING), org.mockito.ArgumentMatchers.any())).thenReturn(List.of(link));
        when(bookings.findByIdWithLock(bookingId)).thenReturn(Optional.of(com.hospital.api.entity.Booking.builder().bookingId(bookingId).build()));
        CounterTicket completed = CounterTicket.builder().ticketId(10L).status(CounterTicketStatus.SERVED).build();
        when(tickets.findByIdForUpdate(10L)).thenReturn(Optional.of(completed));
        when(counters.findById(1)).thenReturn(Optional.of(Counter.builder().counterId(1).build()));
        var service = new CounterServiceImpl(counters, mock(CounterAssignmentRepository.class), tickets, mock(AccountRepository.class), bookings,
                mock(RoomRepository.class), mock(BookingService.class), mock(KioskDispatchTransactionService.class), reception,
                Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));
        org.junit.jupiter.api.Assertions.assertThrows(com.hospital.api.exception.AppException.class, () -> service.callNextTicket(1, java.util.UUID.randomUUID()));
        org.junit.jupiter.api.Assertions.assertThrows(com.hospital.api.exception.AppException.class, () -> service.skipTicket(10L, 1, java.util.UUID.randomUUID()));
        assertEquals(CounterTicketStatus.SERVED, completed.getStatus());
        verify(tickets, never()).save(org.mockito.ArgumentMatchers.any());
        verify(counters, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
    void completionRequiresPaymentAndUpdatesLinkedTicketWithBookingAtomically(boolean free) {
        CounterRepository counters = mock(CounterRepository.class);
        CounterTicketRepository tickets = mock(CounterTicketRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        Clock clock = Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        var counter = Counter.builder().counterId(1).counterType(CounterType.GENERAL).build();
        var doctor = com.hospital.api.entity.Doctor.builder().doctorId(java.util.UUID.randomUUID()).build();
        var schedule = com.hospital.api.entity.DoctorSchedule.builder().doctor(doctor).scheduleDate(LocalDate.of(2026,10,23)).room(com.hospital.api.entity.Room.builder().roomId(12).build()).build();
        var booking = com.hospital.api.entity.Booking.builder().bookingId(java.util.UUID.randomUUID()).bookingCode("BK20261023ABC123").queueNumber(7)
                .bookingDate(LocalDate.of(2026,10,23)).price(free ? java.math.BigDecimal.ZERO : java.math.BigDecimal.TEN).isPaid(false)
                .status(com.hospital.api.constant.BookingStatus.CONFIRMED).doctor(doctor).timeSlot(com.hospital.api.entity.TimeSlot.builder().doctorSchedule(schedule).build()).build();
        var ticket = CounterTicket.builder().ticketId(10L).booking(booking).counter(counter).queueNumber(2).status(CounterTicketStatus.WAITING).build();
        var link = mock(CounterTicketRepository.TicketLink.class);
        when(link.getCounterId()).thenReturn(1); when(link.getBookingId()).thenReturn(booking.getBookingId());
        when(tickets.findLinkById(10L)).thenReturn(Optional.of(link));
        when(tickets.findByIdForUpdate(10L)).thenReturn(Optional.of(ticket));
        when(bookings.findByIdWithLock(booking.getBookingId())).thenReturn(Optional.of(booking));
        org.mockito.Mockito.lenient().when(tickets.findAllByBookingForUpdate(booking.getBookingId())).thenReturn(List.of(ticket));
        org.mockito.Mockito.lenient().when(counters.findById(1)).thenReturn(Optional.of(counter));
        var reception = new com.hospital.api.service.impl.BookingReceptionTransition(bookings, tickets, counters,
                mock(com.hospital.api.repository.DoctorRepository.class), mock(com.hospital.api.repository.DoctorScheduleRepository.class),
                mock(com.hospital.api.repository.TimeSlotRepository.class), mock(RoomRepository.class), clock);
        var service = new CounterServiceImpl(counters, mock(CounterAssignmentRepository.class), tickets, mock(AccountRepository.class), bookings,
                mock(RoomRepository.class), mock(BookingService.class), mock(KioskDispatchTransactionService.class), reception, clock);
        if (!free) {
            var error = org.junit.jupiter.api.Assertions.assertThrows(com.hospital.api.exception.AppException.class,
                    () -> service.completeTicket(10L, 1, java.util.UUID.randomUUID(), null));
            assertEquals(org.springframework.http.HttpStatus.PAYMENT_REQUIRED, error.getStatus());
            assertEquals(CounterTicketStatus.WAITING, ticket.getStatus());
            org.junit.jupiter.api.Assertions.assertNull(booking.getDispatchedAt());
            booking.setIsPaid(true);
        }
        service.completeTicket(10L, 1, java.util.UUID.randomUUID(), null);
        var first = booking.getDispatchedAt();
        service.completeTicket(10L, 1, java.util.UUID.randomUUID(), null);
        org.junit.jupiter.api.Assertions.assertNotNull(first);
        assertEquals(first, booking.getDispatchedAt());
        assertEquals(CounterTicketStatus.SERVED, ticket.getStatus());
        assertEquals(12, ticket.getDispatchedRoomId());
        assertEquals(!free, booking.getIsPaid());
        verify(tickets).save(ticket);
    }

    @Test
    void repeatedDispatchReturnsThePersistedTicketWithoutCreatingAnotherBookingOrTicket() {
        CounterRepository counters = mock(CounterRepository.class);
        CounterAssignmentRepository assignments = mock(CounterAssignmentRepository.class);
        CounterTicketRepository tickets = mock(CounterTicketRepository.class);
        AccountRepository accounts = mock(AccountRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        RoomRepository rooms = mock(RoomRepository.class);
        BookingService bookingService = mock(BookingService.class);
        KioskDispatchTransactionService transactionService = new KioskDispatchTransactionService(
                counters, tickets, bookings, bookingService, mock(com.hospital.api.service.impl.BookingReceptionTransition.class),
                Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));
        CounterServiceImpl service = new CounterServiceImpl(
                counters, assignments, tickets, accounts, bookings, rooms, bookingService, transactionService, mock(com.hospital.api.service.impl.BookingReceptionTransition.class),
                Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));

        CounterTicket persisted = CounterTicket.builder()
                .ticketId(17L)
                .ticketCode("TH-04")
                .idempotencyKey("stable-request-key")
                .waitingBefore(3)
                .queueNumber(4)
                .ticketDate(LocalDate.of(2026, 10, 23))
                .counterType(CounterType.GENERAL)
                .patientName("Patient")
                .status(CounterTicketStatus.WAITING)
                .build();
        when(tickets.findByIdempotencyKeyAndDeletedFalse("stable-request-key"))
                .thenReturn(Optional.of(persisted));

        CounterTicketResponse response = service.dispatchFromKiosk(new KioskDispatchRequest(
                "Patient", "0987654321", 1, 1980, false, null, false, null, "stable-request-key"));

        assertEquals(17L, response.ticketId());
        assertEquals("TH-04", response.ticketCode());
        assertEquals(3, response.waitingBefore());
        verify(tickets, never()).saveAndFlush(org.mockito.ArgumentMatchers.any(CounterTicket.class));
        verify(bookingService, never()).createKioskBooking(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void counterWaitingCountsUseTheHospitalCalendarDate() {
        CounterRepository counters = mock(CounterRepository.class);
        CounterAssignmentRepository assignments = mock(CounterAssignmentRepository.class);
        CounterTicketRepository tickets = mock(CounterTicketRepository.class);
        AccountRepository accounts = mock(AccountRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        RoomRepository rooms = mock(RoomRepository.class);
        BookingService bookingService = mock(BookingService.class);
        Clock hospitalClock = Clock.fixed(Instant.parse("2026-10-22T17:30:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        KioskDispatchTransactionService transactionService = new KioskDispatchTransactionService(
                counters, tickets, bookings, bookingService, mock(com.hospital.api.service.impl.BookingReceptionTransition.class), hospitalClock);
        CounterServiceImpl service = new CounterServiceImpl(
                counters, assignments, tickets, accounts, bookings, rooms, bookingService, transactionService, mock(com.hospital.api.service.impl.BookingReceptionTransition.class),
                hospitalClock);

        Counter counter = Counter.builder()
                .counterId(5)
                .counterCode("CTR-05")
                .counterName("Reception")
                .counterType(CounterType.GENERAL)
                .build();
        when(counters.findAllByDeletedFalseOrderByDisplayOrderAsc()).thenReturn(List.of(counter));
        when(tickets.countByCounter_CounterIdAndTicketDateAndStatus(
                eq(5), eq(LocalDate.of(2026, 10, 23)), eq(CounterTicketStatus.WAITING)))
                .thenReturn(2);

        var result = service.getAllCounters();

        assertEquals(2, result.get(0).waitingCount());
        verify(tickets).countByCounter_CounterIdAndTicketDateAndStatus(
                5, LocalDate.of(2026, 10, 23), CounterTicketStatus.WAITING);
    }
}
