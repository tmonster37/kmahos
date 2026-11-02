package com.hospital.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.api.constant.*;
import com.hospital.api.dto.request.CashierPaymentRequest;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CashierBookingWorkflowTest {
    @Mock BookingRepository bookings;
    @Mock MedicalExaminationRecordRepository records;
    @Mock TransactionRepository transactions;
    @Mock AuditLogService audit;
    @Mock BookingReceptionTransition reception;
    @Spy ObjectMapper mapper = new ObjectMapper();
    @InjectMocks CashierServiceImpl service;
    Booking booking;
    List<Transaction> paid;
    @BeforeEach void setup() {
        booking = Booking.builder().bookingId(UUID.randomUUID()).bookingCode("BK20261023ABC123").queueNumber(4).price(BigDecimal.TEN).isPaid(false).status(BookingStatus.PENDING_PAYMENT).build();
        paid = new ArrayList<>();
        when(bookings.findByBookingCodeForUpdate(booking.getBookingCode())).thenReturn(Optional.of(booking));
        when(transactions.findAllByDescriptionContainingAndStatus(booking.getBookingCode(), "SUCCESS")).thenAnswer(i -> List.copyOf(paid));
        lenient().when(transactions.save(any())).thenAnswer(i -> { Transaction t=i.getArgument(0); t.setTransactionId(UUID.randomUUID()); paid.add(t); return t; });
    }
    @Test void physicalPaymentRetryReturnsReceiptWithoutDuplicateCharge() {
        var request = new CashierPaymentRequest("BILL-"+booking.getBookingCode()+"-EXAM", PaymentMethod.CASH, BigDecimal.TEN, null);
        var first = service.processPayment("cashier", request);
        var repeated = service.processPayment("cashier", request);
        assertEquals(first.receiptCode(), repeated.receiptCode());
        verify(transactions).save(any()); assertTrue(booking.getIsPaid());
        verify(reception, times(2)).checkIn(booking, CounterType.APPOINTMENT, false);
    }
    @Test void unconfirmedDigitalTenderCannotCreatePaidBooking() {
        assertThrows(AppException.class, () -> service.processPayment("cashier", new CashierPaymentRequest(booking.getBookingCode(), PaymentMethod.VIETQR, BigDecimal.TEN, null)));
        assertFalse(booking.getIsPaid()); verify(transactions, never()).save(any());
    }
}
