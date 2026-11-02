package com.hospital.api.service;

import com.hospital.api.constant.*;
import com.hospital.api.dto.request.StartExaminationRequest;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.ClinicalExaminationServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClinicalExaminationServiceTest {
    @Mock BookingRepository bookings;
    @Mock DoctorRepository doctors;
    @Mock MedicalExaminationRecordRepository records;
    @InjectMocks ClinicalExaminationServiceImpl service;
    UUID doctorUser = UUID.randomUUID();

    Booking booking(String code, boolean paid, BigDecimal price, boolean dispatched) {
        return Booking.builder().bookingCode(code).queueNumber(7).price(price).isPaid(paid)
                .status(BookingStatus.CONFIRMED).checkedInAt(LocalDateTime.now())
                .dispatchedAt(dispatched ? LocalDateTime.now() : null).build();
    }
    void prepareStart(Booking b) {
        Doctor d = Doctor.builder().doctorId(UUID.randomUUID()).build();
        var r = MedicalExaminationRecord.builder().booking(b).doctor(d).state(MedicalExamState.WAITING).build();
        lenient().when(bookings.findByBookingCode(b.getBookingCode())).thenReturn(Optional.of(b));
        lenient().when(bookings.findByBookingCodeForUpdate(b.getBookingCode())).thenReturn(Optional.of(b));
        lenient().when(doctors.findByAccount_UserId(doctorUser)).thenReturn(Optional.of(d));
        lenient().when(records.findByBooking_BookingCode(b.getBookingCode())).thenReturn(Optional.of(r));
        lenient().when(records.save(r)).thenReturn(r);
    }
    @Test void priorityStatusAndCheckInCannotSubstituteForPayment() {
        Booking b = booking("unpaid", false, BigDecimal.TEN, true); b.setIsPriority(true);
        prepareStart(b);
        AppException e = assertThrows(AppException.class, () -> service.startExamination(doctorUser, new StartExaminationRequest("unpaid", null, null)));
        assertEquals(HttpStatus.PAYMENT_REQUIRED, e.getStatus());
        verify(records, never()).save(any());
    }
    @Test void paidButUndispatchedCannotStart() {
        Booking b = booking("paid", true, BigDecimal.TEN, false); prepareStart(b);
        AppException e = assertThrows(AppException.class, () -> service.startExamination(doctorUser, new StartExaminationRequest("paid", null, null)));
        assertEquals(HttpStatus.CONFLICT, e.getStatus());
    }
    @Test void freeUnpaidBookingCanStartAfterDispatch() {
        Booking b = booking("free", false, BigDecimal.ZERO, true); prepareStart(b);
        assertNotNull(service.startExamination(doctorUser, new StartExaminationRequest("free", null, null)));
        assertFalse(b.getIsPaid());
    }
    @Test void doctorAndPublicQueuesRequirePaymentEligibilityAndDispatch() {
        Booking unpaid = booking("unpaid", false, BigDecimal.TEN, true); unpaid.setIsPriority(true);
        Booking beforeArrival = booking("before", true, BigDecimal.TEN, false);
        Booking free = booking("free", false, BigDecimal.ZERO, true);
        Booking paid = booking("paid", true, BigDecimal.TEN, true); paid.setStatus(BookingStatus.IN_PROGRESS);
        Booking completedUnpaid = booking("completed", false, BigDecimal.TEN, true); completedUnpaid.setStatus(BookingStatus.COMPLETED);
        var list = List.of(unpaid, beforeArrival, free, paid, completedUnpaid);
        LocalDate date = LocalDate.of(2026, 10, 31);
        when(bookings.findAllByDoctor_Account_UserIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(doctorUser, date)).thenReturn(list);
        when(bookings.findAllByBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(date)).thenReturn(list);
        assertEquals(List.of("paid", "free"), service.getDoctorQueue(doctorUser, date).stream().map(q -> q.bookingCode()).toList());
        assertEquals(List.of("paid", "free"), service.getPublicQueue(date).stream().map(q -> q.bookingCode()).toList());
    }
}
