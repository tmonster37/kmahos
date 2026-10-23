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
    void repeatedDispatchReturnsThePersistedTicketWithoutCreatingAnotherBookingOrTicket() {
        CounterRepository counters = mock(CounterRepository.class);
        CounterAssignmentRepository assignments = mock(CounterAssignmentRepository.class);
        CounterTicketRepository tickets = mock(CounterTicketRepository.class);
        AccountRepository accounts = mock(AccountRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        RoomRepository rooms = mock(RoomRepository.class);
        BookingService bookingService = mock(BookingService.class);
        KioskDispatchTransactionService transactionService = new KioskDispatchTransactionService(
                counters, tickets, bookings, bookingService,
                Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));
        CounterServiceImpl service = new CounterServiceImpl(
                counters, assignments, tickets, accounts, bookings, rooms, bookingService, transactionService,
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
                counters, tickets, bookings, bookingService, hospitalClock);
        CounterServiceImpl service = new CounterServiceImpl(
                counters, assignments, tickets, accounts, bookings, rooms, bookingService, transactionService,
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
