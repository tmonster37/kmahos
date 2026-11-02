package com.hospital.api.service;

import com.hospital.api.constant.*;
import com.hospital.api.dto.request.*;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.*;
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
class NurseReceptionWorkflowTest {
    @Mock BookingRepository bookings;
    @Mock MedicalExaminationRecordRepository records;
    @Mock AccountRepository accounts;
    @Mock TransactionRepository transactions;
    @Mock BookingReceptionTransition reception;
    @Spy Clock hospitalClock = Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    @InjectMocks NurseReceptionServiceImpl service;
    Booking booking;
    UUID staff = UUID.randomUUID();
    @BeforeEach void setup() {
        booking = Booking.builder().bookingId(UUID.randomUUID()).bookingCode("BK20261023ABC123").queueNumber(7)
                .bookingDate(LocalDate.of(2026,10,23)).price(BigDecimal.TEN).isPaid(false).status(BookingStatus.PENDING_PAYMENT).build();
        lenient().when(bookings.findByIdWithLock(booking.getBookingId())).thenReturn(Optional.of(booking));
    }
    @Test void nurseQrUsesBookingLockAndSharedCheckInWithoutSettingInProgress() {
        when(bookings.findByBookingCodeForUpdate(booking.getBookingCode())).thenReturn(Optional.of(booking));
        var record = MedicalExaminationRecord.builder().booking(booking).state(MedicalExamState.WAITING).build();
        when(records.findByBooking_BookingId(booking.getBookingId())).thenReturn(Optional.of(record));
        service.checkInByQr(new NurseCheckInRequest(null, booking.getBookingCode(), null,null,null,null,null,null,null,null), staff);
        verify(reception).checkIn(booking, CounterType.APPOINTMENT, false);
        assertEquals(BookingStatus.PENDING_PAYMENT, booking.getStatus());
        assertFalse(booking.getIsPaid());
    }
    @Test void physicalClinicPaymentRetryChargesOnlyOnceAndJoinsReception() {
        PayAtClinicRequest request = new PayAtClinicRequest(booking.getBookingId(), BigDecimal.TEN, "CASH", null);
        service.payAtClinic(request, staff); service.payAtClinic(request, staff);
        verify(transactions).save(any(Transaction.class));
        verify(reception, times(2)).checkIn(booking, CounterType.APPOINTMENT, false);
        assertTrue(booking.getIsPaid());
    }
    @Test void clinicCannotTrustClientAmountOrDigitalPaymentClaim() {
        assertThrows(AppException.class, () -> service.payAtClinic(new PayAtClinicRequest(booking.getBookingId(), BigDecimal.ONE, "CASH", null), staff));
        assertThrows(AppException.class, () -> service.payAtClinic(new PayAtClinicRequest(booking.getBookingId(), BigDecimal.TEN, "VIETQR", null), staff));
        verify(transactions, never()).save(any()); assertFalse(booking.getIsPaid());
    }
    @Test void freeClinicVisitDoesNotBecomePaidOrGenerateCharge() {
        booking.setPrice(BigDecimal.ZERO);
        service.payAtClinic(new PayAtClinicRequest(booking.getBookingId(), BigDecimal.ZERO, "CASH", null), staff);
        assertFalse(booking.getIsPaid()); verify(transactions, never()).save(any());
        verify(reception).checkIn(booking, CounterType.APPOINTMENT, false);
    }
    @Test void nurseDispatchUsesSharedRoomAndDoctorTransition() {
        UUID doctor = UUID.randomUUID();
        service.dispatchBooking(booking.getBookingId(), 12, null, doctor);
        verify(reception).dispatchTo(booking, 12, null, doctor);
    }
}
