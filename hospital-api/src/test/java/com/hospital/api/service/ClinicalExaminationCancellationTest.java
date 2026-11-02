package com.hospital.api.service;

import com.hospital.api.constant.MedicalExamState;
import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.dto.request.*;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.ClinicalExaminationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClinicalExaminationCancellationTest {
    @Mock MedicalTestRepository tests;
    @Mock MedicalExaminationRecordRepository records;
    @Mock TransactionRepository transactions;
    @Mock AuditLogService auditLog;
    @InjectMocks ClinicalExaminationServiceImpl service;

    MedicalExaminationRecord record;
    MedicalTest test;

    @BeforeEach
    void setup() {
        record = MedicalExaminationRecord.builder().recordId(UUID.randomUUID())
                .state(MedicalExamState.IN_TESTING)
                .booking(Booking.builder().bookingCode("BK-CANCEL").price(BigDecimal.TEN)
                        .isPaid(false).isPriority(false).build()).build();
        test = test(MedicalTestState.WAITING);
        record.getMedicalTests().add(test);
        lenient().when(tests.findById(test.getMedicalTestId())).thenReturn(Optional.of(test));
        lenient().when(tests.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(transactions.findAllByDescriptionContainingAndStatus("BK-CANCEL", "SUCCESS"))
                .thenReturn(List.of());
    }

    private MedicalTest test(MedicalTestState state) {
        return MedicalTest.builder().medicalTestId(UUID.randomUUID()).testCode("TEST-CANCEL")
                .medicalRecord(record).medicalService(MedicalService.builder().serviceName("Lab").build())
                .price(BigDecimal.TEN).state(state).build();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n"})
    void missingClinicalReasonIsRejectedWithoutChangingTest(String reason) {
        AppException error = assertThrows(AppException.class,
                () -> service.cancelMedicalTest(test.getMedicalTestId(), reason));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals(MedicalTestState.WAITING, test.getState());
        verify(tests, never()).save(any());
    }

    @Test
    void persistsTrimmedReasonAndReleasesAnUnpaidCancelledOnlyExamination() {
        var response = service.cancelMedicalTest(test.getMedicalTestId(), "  Patient declined  ");
        assertEquals(MedicalTestState.CANCELLED, response.state());
        assertEquals("[ĐÃ HỦY CHỈ ĐỊNH]: Patient declined", response.testResult());
        assertFalse(response.isPaid());
        assertFalse(record.getBooking().getIsPaid());
        assertEquals(MedicalExamState.DIAGNOSING, record.getState());
        verify(tests).save(test);
        verify(records).save(record);
    }

    @ParameterizedTest
    @EnumSource(value = MedicalTestState.class, names = {"COMPLETED", "CANCELLED"})
    void releasesExaminationWithOtherTerminalTests(MedicalTestState otherState) {
        record.getMedicalTests().add(test(otherState));
        service.cancelMedicalTest(test.getMedicalTestId(), "Contraindication");
        assertEquals(MedicalExamState.DIAGNOSING, record.getState());
    }

    @ParameterizedTest
    @EnumSource(value = MedicalTestState.class, names = {"WAITING", "SAMPLE_COLLECTED", "PROCESSING"})
    void remainingActiveTestHoldsExaminationAndStillRequiresPayment(MedicalTestState otherState) {
        MedicalTest remaining = test(otherState);
        record.getMedicalTests().add(test(MedicalTestState.COMPLETED));
        record.getMedicalTests().add(remaining);
        when(tests.findById(remaining.getMedicalTestId())).thenReturn(Optional.of(remaining));
        service.cancelMedicalTest(test.getMedicalTestId(), "Patient declined");
        assertEquals(MedicalExamState.IN_TESTING, record.getState());
        assertEquals(otherState, remaining.getState());
        assertEquals(HttpStatus.PAYMENT_REQUIRED, assertThrows(AppException.class,
                () -> service.collectSpecimen(remaining.getMedicalTestId(), new CollectSpecimenRequest("Blood", null, null))).getStatus());
        assertEquals(HttpStatus.PAYMENT_REQUIRED, assertThrows(AppException.class,
                () -> service.updateTestResult(remaining.getMedicalTestId(), new UpdateTestResultRequest("Normal", null))).getStatus());
        assertEquals(HttpStatus.PAYMENT_REQUIRED, assertThrows(AppException.class,
                () -> service.saveDetailedTestResult(remaining.getMedicalTestId(),
                        new SaveDetailedTestResultRequest("Normal", null, null, false, List.of()))).getStatus());
        verify(tests, never()).save(remaining);
        verify(records, never()).save(any());
    }

    @Test
    void completedTestCannotBeCancelled() {
        test.setState(MedicalTestState.COMPLETED);
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AppException.class,
                () -> service.cancelMedicalTest(test.getMedicalTestId(), "Declined")).getStatus());
        assertEquals(MedicalTestState.COMPLETED, test.getState());
        verify(tests, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = MedicalTestState.class, names = {"WAITING", "SAMPLE_COLLECTED", "PROCESSING"})
    void activeTestsCanBeCancelled(MedicalTestState state) {
        test.setState(state);
        service.cancelMedicalTest(test.getMedicalTestId(), "Contraindication");
        assertEquals(MedicalTestState.CANCELLED, test.getState());
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void completingRemainingTestReleasesRecordWithCancelledSibling(boolean detailed) {
        record.setBooking(null);
        record.getMedicalTests().add(test(MedicalTestState.CANCELLED));
        if (detailed) {
            service.saveDetailedTestResult(test.getMedicalTestId(),
                    new SaveDetailedTestResultRequest("Normal", null, null, false, List.of()));
        } else {
            service.updateTestResult(test.getMedicalTestId(), new UpdateTestResultRequest("Normal", null));
        }
        assertEquals(MedicalTestState.COMPLETED, test.getState());
        assertEquals(MedicalExamState.DIAGNOSING, record.getState());
    }

    @Test
    void repeatedCancellationPreservesOriginalClinicalReason() {
        service.cancelMedicalTest(test.getMedicalTestId(), "Original reason");
        service.cancelMedicalTest(test.getMedicalTestId(), "Replacement reason");
        assertEquals("[ĐÃ HỦY CHỈ ĐỊNH]: Original reason", test.getTestResult());
        verify(tests, times(1)).save(any());
    }

    @Test
    void cancelledTestCannotBeResumedEvenWhenPaid() {
        test.setState(MedicalTestState.CANCELLED);
        test.setTestResult("[ĐÃ HỦY CHỈ ĐỊNH]: Declined");
        record.setBooking(null); // Existing no-booking path passes the payment check.
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AppException.class,
                () -> service.collectSpecimen(test.getMedicalTestId(), new CollectSpecimenRequest("Blood", null, null))).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AppException.class,
                () -> service.updateTestResult(test.getMedicalTestId(), new UpdateTestResultRequest("Normal", null))).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AppException.class,
                () -> service.saveDetailedTestResult(test.getMedicalTestId(),
                        new SaveDetailedTestResultRequest("Normal", null, null, false, List.of()))).getStatus());
        assertEquals(MedicalTestState.CANCELLED, test.getState());
        assertEquals("[ĐÃ HỦY CHỈ ĐỊNH]: Declined", test.getTestResult());
        verify(tests, never()).save(any());
    }

    @Test
    void missingTestReturnsNotFound() {
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(AppException.class,
                () -> service.cancelMedicalTest(UUID.randomUUID(), "Declined")).getStatus());
    }
}
