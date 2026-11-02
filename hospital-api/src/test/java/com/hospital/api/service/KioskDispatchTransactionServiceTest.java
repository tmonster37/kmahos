package com.hospital.api.service;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.CounterStatus;
import com.hospital.api.constant.CounterTicketStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.dto.request.KioskDispatchRequest;
import com.hospital.api.dto.response.BookingResponse;
import com.hospital.api.dto.response.CounterTicketResponse;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.Counter;
import com.hospital.api.entity.CounterTicket;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.CounterRepository;
import com.hospital.api.repository.CounterTicketRepository;
import com.hospital.api.service.impl.KioskDispatchTransactionService;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class KioskDispatchTransactionServiceTest {

    @Test void newWalkInRetainsInsuranceRoutingOnTheSinglePersistedBookingTicket() {
        CounterRepository counters = mock(CounterRepository.class);
        CounterTicketRepository tickets = mock(CounterTicketRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        BookingService bookingService = mock(BookingService.class);
        Counter insurance = Counter.builder().counterId(3).counterType(CounterType.INSURANCE).status(CounterStatus.OPEN).build();
        when(counters.findAllForKioskDispatchForUpdate(CounterType.GENERAL, java.util.Arrays.asList(CounterType.values()))).thenReturn(List.of(insurance));
        Booking booking = Booking.builder().bookingId(java.util.UUID.randomUUID()).bookingCode("KIOSK20261023ABC123").price(BigDecimal.TEN).isPaid(false)
                .bookingDate(LocalDate.of(2026,10,23)).checkedInAt(java.time.LocalDateTime.of(2026,10,23,9,0)).build();
        when(bookingService.createKioskBooking(any())).thenReturn(BookingResponse.builder().bookingCode(booking.getBookingCode()).build());
        when(bookings.findByBookingCode(booking.getBookingCode())).thenReturn(Optional.of(booking));
        CounterTicket existing = CounterTicket.builder().booking(booking).counterType(CounterType.GENERAL).status(CounterTicketStatus.WAITING).build();
        when(tickets.findAllByBookingForUpdate(booking.getBookingId())).thenReturn(List.of(existing));
        when(tickets.saveAndFlush(existing)).thenReturn(existing);
        Clock clock = Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        var reception = new com.hospital.api.service.impl.BookingReceptionTransition(bookings, tickets, counters,
                mock(com.hospital.api.repository.DoctorRepository.class), mock(com.hospital.api.repository.DoctorScheduleRepository.class),
                mock(com.hospital.api.repository.TimeSlotRepository.class), mock(com.hospital.api.repository.RoomRepository.class), clock);
        var service = new KioskDispatchTransactionService(counters, tickets, bookings, bookingService, reception, clock);
        var result = service.dispatch(new KioskDispatchRequest("Patient", "0987654321", 1, 1980, false, null, true, null, "insurance-key"));
        assertEquals(CounterType.INSURANCE, result.counterType()); assertEquals(3, result.counterId());
        assertEquals("insurance-key", existing.getIdempotencyKey()); assertEquals(CounterTicketStatus.WAITING, result.status());
        verify(tickets).saveAndFlush(existing); verify(bookingService).createKioskBooking(any());
    }
    private com.hospital.api.service.impl.BookingReceptionTransition transition(CounterRepository counters) {
        var transition = mock(com.hospital.api.service.impl.BookingReceptionTransition.class);
        when(transition.lockCounters()).thenAnswer(i -> counters.findAllForKioskDispatchForUpdate(CounterType.GENERAL, java.util.Arrays.asList(CounterType.values())));
        return transition;
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
    void successfulWalkInPersistsOneBookingLinkAndOneTicket(boolean clientPayNow) {
        CounterRepository counters = mock(CounterRepository.class);
        CounterTicketRepository tickets = mock(CounterTicketRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        BookingService bookingService = mock(BookingService.class);
        LocalDate today = LocalDate.of(2026, 10, 23);
        Clock clock = Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        Counter counter = Counter.builder()
                .counterId(1)
                .counterCode("CTR-01")
                .counterName("General")
                .counterType(CounterType.GENERAL)
                .status(CounterStatus.OPEN)
                .build();
        Booking booking = Booking.builder().bookingCode("KIOSK-BOOKING").build();
        when(counters.findAllForKioskDispatchForUpdate(CounterType.GENERAL, java.util.Arrays.asList(CounterType.values())))
                .thenReturn(List.of(counter));
        when(tickets.findByIdempotencyKeyAndDeletedFalse("request-1")).thenReturn(Optional.empty());
        when(tickets.countByCounter_CounterIdAndTicketDateAndStatus(1, today, CounterTicketStatus.WAITING))
                .thenReturn(0);
        when(tickets.countByTicketDateAndCounterType(today, CounterType.GENERAL)).thenReturn(0);
        when(bookingService.createKioskBooking(any())).thenReturn(BookingResponse.builder()
                .bookingCode("KIOSK-BOOKING")
                .queueNumber(1)
                .queueCode("KB-01")
                .isPriority(false)
                .bookingDate(today)
                .patientName("Patient")
                .doctorName("Doctor")
                .departmentName("Dept")
                .roomName("Room")
                .price(BigDecimal.ONE)
                .status(BookingStatus.CONFIRMED)
                .symptoms("Kiosk")
                .patientPhone("0987654321")
                .patientDob(LocalDate.of(2000, 1, 1))
                .patientGender("OTHER")
                .build());
        when(bookings.findByBookingCode("KIOSK-BOOKING")).thenReturn(Optional.of(booking));
        when(tickets.saveAndFlush(any(CounterTicket.class))).thenAnswer(invocation -> {
            CounterTicket ticket = invocation.getArgument(0);
            ticket.setTicketId(10L);
            return ticket;
        });

        KioskDispatchTransactionService service = new KioskDispatchTransactionService(
                counters, tickets, bookings, bookingService, transition(counters), clock);
        CounterTicketResponse result = service.dispatch(new KioskDispatchRequest(
                "Patient", "0987654321", 1, 2000, false, null, false, null, "request-1", clientPayNow));

        assertEquals(10L, result.ticketId());
        assertEquals("KIOSK-BOOKING", result.bookingCode());
        assertEquals(CounterTicketStatus.WAITING, result.status());
        assertEquals(false, result.isPaid());
        verify(bookingService, times(1)).createKioskBooking(any());
        verify(tickets, times(1)).saveAndFlush(any(CounterTicket.class));

        InOrder order = inOrder(counters, tickets, bookingService);
        order.verify(counters).findAllForKioskDispatchForUpdate(CounterType.GENERAL, java.util.Arrays.asList(CounterType.values()));
        order.verify(tickets).findByIdempotencyKeyAndDeletedFalse("request-1");
        order.verify(tickets).countByTicketDateAndCounterType(today, CounterType.GENERAL);
        order.verify(bookingService).createKioskBooking(any());
    }

    @Test
    void bookingFailureDoesNotPersistCounterTicket() {
        CounterRepository counters = mock(CounterRepository.class);
        CounterTicketRepository tickets = mock(CounterTicketRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        BookingService bookingService = mock(BookingService.class);
        LocalDate today = LocalDate.of(2026, 10, 23);
        Counter counter = Counter.builder()
                .counterId(1)
                .counterCode("CTR-01")
                .counterName("General")
                .counterType(CounterType.GENERAL)
                .status(CounterStatus.OPEN)
                .build();
        when(counters.findAllForKioskDispatchForUpdate(CounterType.GENERAL, java.util.Arrays.asList(CounterType.values())))
                .thenReturn(List.of(counter));
        when(tickets.findByIdempotencyKeyAndDeletedFalse("request-2")).thenReturn(Optional.empty());
        when(tickets.countByCounter_CounterIdAndTicketDateAndStatus(1, today, CounterTicketStatus.WAITING))
                .thenReturn(0);
        when(tickets.countByTicketDateAndCounterType(today, CounterType.GENERAL)).thenReturn(0);
        when(bookingService.createKioskBooking(any())).thenThrow(new AppException("No schedule", org.springframework.http.HttpStatus.CONFLICT));

        KioskDispatchTransactionService service = new KioskDispatchTransactionService(
                counters, tickets, bookings, bookingService, transition(counters),
                Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));

        assertThrows(AppException.class, () -> service.dispatch(new KioskDispatchRequest(
                "Patient", "0987654321", 1, 2000, false, null, false, null, "request-2")));
        verify(tickets, never()).saveAndFlush(any(CounterTicket.class));
    }

    @Test
    void duplicateRequestIsRecheckedAfterDeterministicFallbackLock() {
        CounterRepository counters = mock(CounterRepository.class);
        CounterTicketRepository tickets = mock(CounterTicketRepository.class);
        BookingRepository bookings = mock(BookingRepository.class);
        BookingService bookingService = mock(BookingService.class);
        LocalDate today = LocalDate.of(2026, 10, 23);
        Clock clock = Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        Counter fallbackCounter = Counter.builder()
                .counterId(2)
                .counterCode("CTR-02")
                .counterName("Appointment")
                .counterType(CounterType.APPOINTMENT)
                .status(CounterStatus.OPEN)
                .build();
        CounterTicket persisted = CounterTicket.builder()
                .ticketId(42L)
                .ticketCode("UT-03")
                .queueNumber(3)
                .ticketDate(today)
                .counterType(CounterType.PRIORITY)
                .patientName("Patient")
                .status(CounterTicketStatus.WAITING)
                .waitingBefore(2)
                .build();
        when(counters.findAllForKioskDispatchForUpdate(
                CounterType.GENERAL, java.util.Arrays.asList(CounterType.values())))
                .thenReturn(List.of(fallbackCounter));
        when(tickets.findByIdempotencyKeyAndDeletedFalse("request-duplicate"))
                .thenReturn(Optional.of(persisted));

        KioskDispatchTransactionService service = new KioskDispatchTransactionService(
                counters, tickets, bookings, bookingService, transition(counters), clock);
        CounterTicketResponse result = service.dispatch(new KioskDispatchRequest(
                "Patient", "0987654321", 1, 1960, true, null, false, null, "request-duplicate"));

        assertEquals(42L, result.ticketId());
        assertEquals("UT-03", result.ticketCode());
        assertEquals(2, result.waitingBefore());
        InOrder order = inOrder(counters, tickets);
        order.verify(counters).findAllForKioskDispatchForUpdate(
                CounterType.GENERAL, java.util.Arrays.asList(CounterType.values()));
        order.verify(tickets).findByIdempotencyKeyAndDeletedFalse("request-duplicate");
        verify(bookingService, never()).createKioskBooking(any());
        verify(tickets, never()).countByTicketDateAndCounterType(today, CounterType.PRIORITY);
        verify(tickets, never()).saveAndFlush(any(CounterTicket.class));
    }
}
