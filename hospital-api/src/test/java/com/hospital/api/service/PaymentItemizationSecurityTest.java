package com.hospital.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.api.constant.*;
import com.hospital.api.dto.request.CashierPaymentRequest;
import com.hospital.api.dto.request.DischargeRequest;
import com.hospital.api.dto.request.DispensePrescriptionRequest;
import com.hospital.api.dto.response.CashierReceiptResponse;
import com.hospital.api.dto.response.MedicalTestResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentItemizationSecurityTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private MedicalExaminationRecordRepository recordRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private DischargeRepository dischargeRepository;
    @Mock private HospitalAdmissionRepository admissionRepository;
    @Mock private MedicalTestRepository testRepository;
    @Mock private PrescriptionRepository prescriptionRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private BookingReceptionTransition reception;
    @Mock private AccountRepository accountRepository;
    @Mock private MedicalConceptRepository conceptRepository;
    @Mock private MedicalObservationRepository observationRepository;
    @Mock private MedicalConditionRepository conditionRepository;
    @Mock private MedicalServiceRepository serviceRepository;
    @Mock private MedicineRepository medicineRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private MedicalRecordAddendumRepository addendumRepository;
    @Mock private MedicalTestResultItemRepository resultItemRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private PatientProfileRepository profileRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private HospitalizationDetailRepository detailRepository;
    @Mock private BedRepository bedRepository;
    @Mock private InpatientBedTransferRepository transferRepository;
    @Mock private InpatientDoctorOrderRepository doctorOrderRepository;
    @Mock private InpatientNursingCareRepository nursingCareRepository;
    @Mock private StaffRepository staffRepository;
    @Mock private PharmacyWarehouseRepository warehouseRepository;
    @Mock private MedicineBatchRepository batchRepository;
    @Mock private WarehouseStockRepository stockRepository;
    @Mock private PrescriptionDispenseRepository dispenseRepository;
    @Mock private StockTransferRepository stockTransferRepository;
    @Mock private StockTransferItemRepository stockTransferItemRepository;
    @Mock private PrescriptionDispenseItemRepository dispenseItemRepository;

    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks private CashierServiceImpl cashierService;
    @InjectMocks private ClinicalExaminationServiceImpl clinicalService;
    @InjectMocks private PharmacyInventoryServiceImpl pharmacyService;
    @InjectMocks private InpatientServiceImpl inpatientService;

    @Test
    @DisplayName("FIN-02: Thanh toán Xét nghiệm KHÔNG tự động mở khóa xuất kho Đơn thuốc (Không đánh dấu tréo)")
    void testMedicalTestPaidDoesNotAuthorizeMedicineDispensing() {
        UUID prescId = UUID.randomUUID();
        String code = "BK20261105001";
        Booking booking = Booking.builder()
                .bookingId(UUID.randomUUID())
                .bookingCode(code)
                .price(BigDecimal.valueOf(100000))
                .isPriority(false)
                .build();

        Prescription prescription = Prescription.builder()
                .prescriptionId(prescId)
                .prescriptionCode("RX-001")
                .totalAmount(BigDecimal.valueOf(500000))
                .isPaid(false)
                .medicalRecord(MedicalExaminationRecord.builder().booking(booking).build())
                .prescriptionItems(List.of(PrescriptionItem.builder()
                        .prescriptionItemId(UUID.randomUUID())
                        .medicine(Medicine.builder().medicineId(101).medicineName("Paracetamol").build())
                        .quantity(10)
                        .unitPrice(BigDecimal.valueOf(50000))
                        .totalPrice(BigDecimal.valueOf(500000))
                        .build()))
                .build();

        when(prescriptionRepository.findByIdWithLock(prescId)).thenReturn(Optional.of(prescription));
        // Giả lập giao dịch thanh toán CHỈ cho xét nghiệm
        Transaction testTxn = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .transactionType(TransactionType.PAY_MEDICAL_TEST)
                .amount(BigDecimal.valueOf(120000))
                .status("SUCCESS")
                .description("Thu ngân viện phí cận lâm sàng [BILL-" + code + "-TEST]")
                .build();
        when(transactionRepository.findAllByBooking_BookingIdAndStatus(booking.getBookingId(), "SUCCESS"))
                .thenReturn(List.of(testTxn));
        when(transactionRepository.existsByPrescription_PrescriptionIdAndStatus(prescId, "SUCCESS"))
                .thenReturn(false);

        DispensePrescriptionRequest req = new DispensePrescriptionRequest(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Xuất thuốc cho bệnh nhân"
        );

        AppException ex = assertThrows(AppException.class, () -> pharmacyService.dispensePrescription(prescId, req));
        assertEquals(HttpStatus.PAYMENT_REQUIRED, ex.getStatus());
        assertTrue(ex.getMessage().contains("chưa được thanh toán tiền thuốc tại quầy thu ngân"));
    }

    @Test
    @DisplayName("FIN-02: Thanh toán Đơn thuốc KHÔNG tự động mở khóa Xét nghiệm chưa trả tiền")
    void testPrescriptionPaidDoesNotAuthorizeUnpaidMedicalTest() {
        UUID testId = UUID.randomUUID();
        String code = "BK20261105002";
        Booking booking = Booking.builder()
                .bookingId(UUID.randomUUID())
                .bookingCode(code)
                .price(BigDecimal.valueOf(100000))
                .build();

        MedicalTest test = MedicalTest.builder()
                .medicalTestId(testId)
                .testCode("TEST-999")
                .price(BigDecimal.valueOf(250000))
                .isPaid(false)
                .state(MedicalTestState.WAITING)
                .medicalService(MedicalService.builder().serviceName("Siêu âm ổ bụng").build())
                .medicalRecord(MedicalExaminationRecord.builder().booking(booking).build())
                .build();

        // Giả lập giao dịch thanh toán đơn thuốc
        Transaction prescTxn = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .transactionType(TransactionType.PAY_PRESCRIPTION)
                .amount(BigDecimal.valueOf(300000))
                .status("SUCCESS")
                .description("Thu ngân viện phí đơn thuốc ngoại trú [BILL-" + code + "-PRESCRIPTION]")
                .build();

        when(transactionRepository.findAllByBooking_BookingIdAndStatus(booking.getBookingId(), "SUCCESS"))
                .thenReturn(List.of(prescTxn));
        when(transactionRepository.existsByMedicalTest_MedicalTestIdAndStatus(testId, "SUCCESS"))
                .thenReturn(false);

        when(testRepository.findById(testId)).thenReturn(Optional.of(test));
        when(testRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        MedicalTestResponse resp = clinicalService.cancelMedicalTest(testId, "Bác sĩ hủy vì nhầm lẫn");
        assertEquals(MedicalTestState.CANCELLED, resp.state());
        assertFalse(resp.isPaid());
        // Xác minh không hoàn tiền vì chưa từng đóng tiền xét nghiệm này
        verify(transactionRepository, never()).save(argThat(t -> t != null && t.getTransactionType() == TransactionType.REFUND));
    }

    @Test
    @DisplayName("FIN-04: Ca khám đã COMPLETED thanh toán tiền thuốc không bị dính lỗi 409 Conflict do gọi checkIn")
    void testCompletedBookingCanPayPrescriptionWithout409Conflict() {
        String code = "BK20261105003";
        Booking booking = Booking.builder()
                .bookingId(UUID.randomUUID())
                .bookingCode(code)
                .price(BigDecimal.valueOf(150000))
                .status(BookingStatus.COMPLETED)
                .isPaid(true)
                .patientProfile(PatientProfile.builder().fullName("Nguyễn Văn A").phoneNumber("0988888888").build())
                .build();

        Prescription presc = Prescription.builder()
                .prescriptionId(UUID.randomUUID())
                .prescriptionCode("RX-123")
                .totalAmount(BigDecimal.valueOf(200000))
                .isPaid(false)
                .prescriptionItems(List.of(
                        PrescriptionItem.builder()
                                .prescriptionItemId(UUID.randomUUID())
                                .medicine(Medicine.builder().medicineId(202).medicineName("Amoxicillin 500mg").build())
                                .quantity(10)
                                .unitPrice(BigDecimal.valueOf(20000))
                                .totalPrice(BigDecimal.valueOf(200000))
                                .build()
                ))
                .build();

        MedicalExaminationRecord record = MedicalExaminationRecord.builder()
                .recordId(UUID.randomUUID())
                .booking(booking)
                .prescription(presc)
                .build();

        when(bookingRepository.findByBookingCodeForUpdate(code)).thenReturn(Optional.of(booking));
        when(recordRepository.findByBooking_BookingCode(code)).thenReturn(Optional.of(record));
        when(transactionRepository.findAllByDescriptionContainingAndStatus(eq(code), eq("SUCCESS"))).thenReturn(List.of());
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> {
            Transaction t = i.getArgument(0);
            t.setTransactionId(UUID.randomUUID());
            return t;
        });

        CashierPaymentRequest request = new CashierPaymentRequest(
                "BILL-" + code + "-PRESCRIPTION",
                PaymentMethod.COUNTER_CASH,
                BigDecimal.valueOf(200000),
                "Bệnh nhân đóng tiền thuốc"
        );

        CashierReceiptResponse receipt = cashierService.processPayment("cashier1", request);

        assertNotNull(receipt);
        assertEquals(code, receipt.bookingCode());
        assertTrue(presc.getIsPaid(), "Prescription phải được cập nhật isPaid = true ngay sau khi thu ngân thu tiền");
        // Quan trọng: reception.checkIn KHÔNG được phép gọi khi ca khám đã COMPLETED và là hóa đơn PRESCRIPTION
        verify(reception, never()).checkIn(any(), any(), anyBoolean());
    }

    @Test
    @DisplayName("FIN-07: Bác sĩ hủy xét nghiệm đã đóng tiền tự động hoàn tiền vào ví bệnh nhân và sinh REFUND transaction")
    void testCancelPaidMedicalTestRefundsAccountBalance() {
        UUID testId = UUID.randomUUID();
        String code = "BK20261105004";
        Account account = Account.builder()
                .userId(UUID.randomUUID())
                .balance(BigDecimal.valueOf(500000))
                .build();
        PatientProfile profile = PatientProfile.builder()
                .fullName("Trần Thị B")
                .account(account)
                .build();
        Booking booking = Booking.builder()
                .bookingId(UUID.randomUUID())
                .bookingCode(code)
                .patientProfile(profile)
                .build();
        MedicalService service = MedicalService.builder()
                .serviceName("Chụp X-Quang Ngực Thẳng")
                .build();
        MedicalTest test = MedicalTest.builder()
                .medicalTestId(testId)
                .testCode("TEST-XQ01")
                .price(BigDecimal.valueOf(150000))
                .isPaid(true)
                .state(MedicalTestState.WAITING)
                .medicalService(service)
                .medicalRecord(MedicalExaminationRecord.builder().booking(booking).build())
                .build();

        when(testRepository.findById(testId)).thenReturn(Optional.of(test));
        when(testRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        MedicalTestResponse response = clinicalService.cancelMedicalTest(testId, "Bệnh nhân mang thai, chống chỉ định X-quang");

        assertEquals(MedicalTestState.CANCELLED, response.state());
        // Số dư ví tài khoản được hoàn lại: 500k + 150k = 650k
        assertEquals(BigDecimal.valueOf(650000), account.getBalance());
        verify(accountRepository).save(account);

        // Ghi nhận transaction loại REFUND
        verify(transactionRepository).save(argThat(t ->
                t != null
                        && t.getTransactionType() == TransactionType.REFUND
                        && t.getAmount().compareTo(BigDecimal.valueOf(150000)) == 0
                        && "SUCCESS".equals(t.getStatus())
        ));
    }

    @Test
    @DisplayName("FIN-03: Quyết toán xuất viện nội trú tính đủ tiền phòng, tiền cận lâm sàng và tiền thuốc phát sinh")
    void testInpatientDischargeSettlementIncludesMedicationsAndTests() {
        UUID admissionId = UUID.randomUUID();
        UUID patientProfileId = UUID.randomUUID();
        Instant admissionDate = Instant.now().minus(3, ChronoUnit.DAYS);

        PatientProfile profile = PatientProfile.builder()
                .patientProfileId(patientProfileId)
                .fullName("Lê Văn C")
                .build();

        HospitalAdmission admission = HospitalAdmission.builder()
                .admissionId(admissionId)
                .patientProfile(profile)
                .admissionDate(admissionDate)
                .dailyRoomFee(BigDecimal.valueOf(300000))
                .state(HospitalAdmissionState.ADMITTED)
                .build();

        // 1 ca khám nội trú phát sinh xét nghiệm 200k và đơn thuốc 400k trong thời gian nằm viện
        MedicalExaminationRecord rec = MedicalExaminationRecord.builder()
                .recordId(UUID.randomUUID())
                .medicalTests(List.of(
                        MedicalTest.builder()
                                .medicalTestId(UUID.randomUUID())
                                .price(BigDecimal.valueOf(200000))
                                .state(MedicalTestState.COMPLETED)
                                .build()
                ))
                .prescription(Prescription.builder()
                        .prescriptionId(UUID.randomUUID())
                        .totalAmount(BigDecimal.valueOf(400000))
                        .build())
                .build();
        rec.setCreatedAt(admissionDate.plus(1, ChronoUnit.DAYS));

        when(admissionRepository.findById(admissionId)).thenReturn(Optional.of(admission));
        when(recordRepository.findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(patientProfileId))
                .thenReturn(List.of(rec));
        when(dischargeRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        DischargeRequest request = new DischargeRequest(
                "Điều trị ổn định, đủ điều kiện xuất viện",
                "Tiếp tục uống thuốc theo đơn và tái khám sau 7 ngày",
                LocalDate.now().plusDays(7)
        );

        Discharge discharge = inpatientService.dischargePatient(admissionId, request);

        assertNotNull(discharge);
        // 3 ngày tiền phòng: 3 * 300.000 = 900.000
        // Tiền xét nghiệm: 200.000
        // Tiền thuốc: 400.000
        // Tổng viện phí: 900.000 + 200.000 + 400.000 = 1.500.000
        assertEquals(BigDecimal.valueOf(1500000), discharge.getTotalInpatientCost());
    }
}
