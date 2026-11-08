package com.hospital.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.response.CashierPendingBillResponse;
import com.hospital.api.dto.response.PatientPendingBillResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.MedicalExaminationRecord;
import com.hospital.api.entity.MedicalService;
import com.hospital.api.entity.MedicalTest;
import com.hospital.api.entity.Medicine;
import com.hospital.api.entity.PatientProfile;
import com.hospital.api.entity.Prescription;
import com.hospital.api.entity.PrescriptionItem;
import com.hospital.api.entity.Transaction;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.DischargeRepository;
import com.hospital.api.repository.HospitalAdmissionRepository;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import com.hospital.api.repository.MedicalTestRepository;
import com.hospital.api.repository.NotificationRepository;
import com.hospital.api.repository.PrescriptionRepository;
import com.hospital.api.repository.TransactionRepository;
import com.hospital.api.service.impl.BookingReceptionTransition;
import com.hospital.api.service.impl.CashierServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatientPendingBillTest {

    private static final String BOOKING_CODE = "BK20261107PAT001";

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private MedicalExaminationRecordRepository recordRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private DischargeRepository dischargeRepository;
    @Mock
    private HospitalAdmissionRepository admissionRepository;
    @Mock
    private MedicalTestRepository testRepository;
    @Mock
    private PrescriptionRepository prescriptionRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private BookingReceptionTransition reception;

    private CashierServiceImpl cashierService;
    private UUID accountId;
    private Booking booking;
    private MedicalExaminationRecord record;

    @BeforeEach
    void setUp() {
        cashierService = new CashierServiceImpl(
                bookingRepository,
                recordRepository,
                transactionRepository,
                notificationRepository,
                dischargeRepository,
                admissionRepository,
                testRepository,
                prescriptionRepository,
                new ObjectMapper(),
                auditLogService,
                reception
        );

        accountId = UUID.randomUUID();
        Account account = Account.builder()
                .userId(accountId)
                .fullName("Nguyễn Văn A")
                .phoneNumber("0901234567")
                .build();

        PatientProfile profile = PatientProfile.builder()
                .patientProfileId(UUID.randomUUID())
                .account(account)
                .fullName("Nguyễn Văn A")
                .phoneNumber("0901234567")
                .identityNumber("079123456789")
                .build();

        booking = Booking.builder()
                .bookingId(UUID.randomUUID())
                .bookingCode(BOOKING_CODE)
                .patientProfile(profile)
                .price(new BigDecimal("120000"))
                .status(BookingStatus.PENDING_PAYMENT)
                .isPaid(false)
                .build();
        booking.setCreatedAt(Instant.parse("2026-11-07T01:00:00Z"));

        MedicalTest test = MedicalTest.builder()
                .medicalTestId(UUID.randomUUID())
                .testCode("TST001")
                .price(new BigDecimal("250000"))
                .state(MedicalTestState.WAITING)
                .isPaid(false)
                .medicalService(MedicalService.builder().serviceName("Xét nghiệm sinh hóa máu").build())
                .build();

        PrescriptionItem medItem = PrescriptionItem.builder()
                .prescriptionItemId(UUID.randomUUID())
                .medicine(Medicine.builder().medicineName("Paracetamol 500mg").build())
                .quantity(2)
                .unitPrice(new BigDecimal("40000"))
                .totalPrice(new BigDecimal("80000"))
                .build();

        Prescription prescription = Prescription.builder()
                .prescriptionId(UUID.randomUUID())
                .isPaid(false)
                .prescriptionItems(List.of(medItem))
                .build();

        record = MedicalExaminationRecord.builder()
                .recordId(UUID.randomUUID())
                .booking(booking)
                .medicalTests(List.of(test))
                .prescription(prescription)
                .build();

        lenient().when(bookingRepository.findAllByPatientProfile_Account_UserIdAndDeletedFalseOrderByCreatedAtDesc(accountId))
                .thenReturn(List.of(booking));
        lenient().when(recordRepository.findByBooking_BookingCode(BOOKING_CODE))
                .thenReturn(Optional.of(record));
    }

    @Test
    void marksLegacyPaymentWithoutCategoryAsUnreconciled() {
        Transaction legacyTxn = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .amount(new BigDecimal("100000"))
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(PaymentMethod.CASH)
                .status("SUCCESS")
                .description("Thu tiền viện phí mã " + BOOKING_CODE)
                .build();
        when(transactionRepository.findAllByDescriptionContainingAndStatus(BOOKING_CODE, "SUCCESS"))
                .thenReturn(List.of(legacyTxn));

        List<PatientPendingBillResponse> bills = cashierService.getPatientPendingBills(accountId);

        assertEquals(3, bills.size());
        assertTrue(bills.stream().allMatch(b -> "UNRECONCILED".equals(b.reconciliationStatus())));
        assertTrue(bills.stream().allMatch(b -> "UNRECONCILED".equals(b.status())));
    }

    @Test
    void doesNotAllocateUnreconciledAmount() {
        Transaction ambiguousTreatmentTxn = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .amount(new BigDecimal("150000"))
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("SUCCESS")
                .description("Thanh toán PayOS: BILL-" + BOOKING_CODE + "-TREATMENT")
                .build();
        when(transactionRepository.findAllByDescriptionContainingAndStatus(BOOKING_CODE, "SUCCESS"))
                .thenReturn(List.of(ambiguousTreatmentTxn));

        List<PatientPendingBillResponse> bills = cashierService.getPatientPendingBills(accountId);

        // Neither TEST (250k) nor PRESCRIPTION (80k) nor EXAM (120k) may absorb the ambiguous 150k payment
        assertEquals(3, bills.size());
        for (PatientPendingBillResponse bill : bills) {
            assertEquals("UNRECONCILED", bill.reconciliationStatus());
            assertNull(bill.totalAmount());
        }
    }

    @Test
    void reflectsCategoryMarkedSettlements() {
        Transaction examSettlement = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .amount(new BigDecimal("120000"))
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("SUCCESS")
                .description("Thanh toán PayOS: BILL-" + BOOKING_CODE + "-EXAM")
                .build();
        Transaction partialTestSettlement = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .amount(new BigDecimal("50000"))
                .transactionType(TransactionType.PAY_MEDICAL_TEST)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("SUCCESS")
                .description("Thanh toán PayOS: BILL-" + BOOKING_CODE + "-TEST")
                .build();
        when(transactionRepository.findAllByDescriptionContainingAndStatus(BOOKING_CODE, "SUCCESS"))
                .thenReturn(List.of(examSettlement, partialTestSettlement));

        List<PatientPendingBillResponse> bills = cashierService.getPatientPendingBills(accountId);

        assertEquals(2, bills.size());
        PatientPendingBillResponse testBill = bills.stream()
                .filter(b -> "TEST".equals(b.category()))
                .findFirst()
                .orElseThrow();
        PatientPendingBillResponse prescBill = bills.stream()
                .filter(b -> "PRESCRIPTION".equals(b.category()))
                .findFirst()
                .orElseThrow();

        assertEquals("BILL-" + BOOKING_CODE + "-TEST", testBill.billId());
        assertEquals("RECONCILED", testBill.reconciliationStatus());
        assertEquals("UNPAID", testBill.status());
        assertEquals(0, new BigDecimal("200000").compareTo(testBill.totalAmount()));

        assertEquals("BILL-" + BOOKING_CODE + "-PRESCRIPTION", prescBill.billId());
        assertEquals("RECONCILED", prescBill.reconciliationStatus());
        assertEquals("UNPAID", prescBill.status());
        assertEquals(0, new BigDecimal("80000").compareTo(prescBill.totalAmount()));
    }

    @Test
    void returnsNullAmountForUnreconciledBill() {
        Transaction legacyUnmarked = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .amount(new BigDecimal("120000"))
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(PaymentMethod.CASH)
                .status("SUCCESS")
                .description("Thu tiền khám " + BOOKING_CODE)
                .build();
        when(transactionRepository.findAllByDescriptionContainingAndStatus(BOOKING_CODE, "SUCCESS"))
                .thenReturn(List.of(legacyUnmarked));

        List<PatientPendingBillResponse> bills = cashierService.getPatientPendingBills(accountId);

        assertFalse(bills.isEmpty());
        for (PatientPendingBillResponse bill : bills) {
            assertEquals("UNRECONCILED", bill.reconciliationStatus());
            assertNull(bill.totalAmount(), "Unreconciled bill must have null totalAmount");
        }
    }

    @Test
    void doesNotOverstateSplitCategoryBalances() {
        booking.setIsPaid(true);
        Transaction examPaidTxn = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .amount(new BigDecimal("120000"))
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("SUCCESS")
                .description("Thanh toán PayOS: BILL-" + BOOKING_CODE + "-EXAM")
                .build();
        when(transactionRepository.findAllByDescriptionContainingAndStatus(BOOKING_CODE, "SUCCESS"))
                .thenReturn(List.of(examPaidTxn));

        List<PatientPendingBillResponse> patientBills = cashierService.getPatientPendingBills(accountId);
        List<CashierPendingBillResponse> legacyBills = cashierService.getPendingBillsForPatient(accountId);

        assertEquals(2, patientBills.size());
        BigDecimal patientTotal = patientBills.stream()
                .map(PatientPendingBillResponse::totalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        // TEST (250,000) + PRESCRIPTION (80,000) = 330,000 (not overstated by combining both into each category)
        assertEquals(0, new BigDecimal("330000").compareTo(patientTotal));

        assertEquals(2, legacyBills.size());
        BigDecimal legacyTotal = legacyBills.stream()
                .map(CashierPendingBillResponse::totalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, new BigDecimal("330000").compareTo(legacyTotal));
    }
}

