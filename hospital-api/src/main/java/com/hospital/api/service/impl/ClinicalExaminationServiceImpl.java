package com.hospital.api.service.impl;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.MedicalExamState;
import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.*;
import com.hospital.api.dto.response.*;
import com.hospital.api.entity.*;
import com.hospital.api.repository.MedicalRecordAddendumRepository;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.ClinicalExaminationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;
import com.hospital.api.constant.ConceptDataType;
import com.hospital.api.constant.ConditionType;
import com.hospital.api.entity.MedicalConcept;
import com.hospital.api.entity.MedicalCondition;
import com.hospital.api.entity.MedicalObservation;
import com.hospital.api.repository.*;

import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClinicalExaminationServiceImpl implements ClinicalExaminationService {

    // Bảng ánh xạ nhóm dị ứng lâm sàng (CDS Drug Allergy Mappings - tham khảo E-healthcare)
    private static final Map<String, List<String>> ALLERGY_GROUP_TARGETS = Map.of(
            "penicillin", List.of("penicillin", "amoxicillin", "ampicillin", "augmentin", "oxacillin", "cloxacillin", "clamoxyl", "beta-lactam", "betalactam"),
            "cephalosporin", List.of("cephalosporin", "cefuroxim", "cefixim", "ceftriaxon", "cefaclor", "cefotaxim", "cefalexin", "cefadroxil"),
            "aspirin", List.of("aspirin", "ibuprofen", "diclofenac", "meloxicam", "celecoxib", "nsaid", "naproxen"),
            "paracetamol", List.of("paracetamol", "acetaminophen", "panadol", "efferalgan", "decolgen"),
            "sulfonamide", List.of("sulfonamid", "sulfa", "bactrim", "cotrimoxazol", "sulfamethoxazol")
    );

    private final MedicalExaminationRecordRepository recordRepository;
    private final BookingRepository bookingRepository;
    private final DoctorRepository doctorRepository;
    private final MedicalServiceRepository serviceRepository;
    private final MedicalTestRepository testRepository;
    private final MedicineRepository medicineRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository;
    private final MedicalConceptRepository conceptRepository;
    private final MedicalObservationRepository observationRepository;
    private final MedicalConditionRepository conditionRepository;
    private final StaffRepository staffRepository;
    private final MedicalTestResultItemRepository resultItemRepository;
    private final MedicalRecordAddendumRepository addendumRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final TransactionRepository transactionRepository;
    private final com.hospital.api.service.AuditLogService auditLogService;
    private final DepartmentRepository departmentRepository;

    private boolean isTestPaid(MedicalTest test) {
        if (test == null) return false;
        if (test.getMedicalRecord() == null || test.getMedicalRecord().getBooking() == null) {
            return true;
        }
        Booking booking = test.getMedicalRecord().getBooking();
        String code = booking.getBookingCode();
        List<Transaction> txns = transactionRepository.findAllByDescriptionContainingAndStatus(code, "SUCCESS");
        if (txns.isEmpty()) {
            return false;
        }

        BigDecimal totalPaid = txns.stream()
                .map(Transaction::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal examPrice = booking.getPrice() != null ? booking.getPrice() : BigDecimal.ZERO;
        BigDecimal testPrice = test.getPrice() != null ? test.getPrice() : BigDecimal.ZERO;

        // Nếu có giao dịch ghi rõ TREATMENT hoặc CLS hoặc TEST
        boolean hasTreatmentTxn = txns.stream().anyMatch(t -> {
            String desc = t.getDescription() != null ? t.getDescription() : "";
            String ref = t.getVnpayTxnRef() != null ? t.getVnpayTxnRef() : "";
            return desc.contains("TREATMENT") || desc.contains("CLS") || desc.contains("TEST") || ref.contains("CLS");
        });
        if (hasTreatmentTxn) {
            return true;
        }

        // Hoặc tổng số tiền thanh toán đủ bao phủ tiền khám + tiền xét nghiệm này
        return totalPaid.compareTo(examPrice.add(testPrice)) >= 0;
    }

    private void sendNotificationToPatient(Booking booking, String title, String content, String type) {
        try {
            if (booking == null || booking.getPatientProfile() == null) return;
            Account targetAccount = booking.getPatientProfile().getAccount();
            if (targetAccount == null && booking.getPatientProfile().getPhoneNumber() != null) {
                targetAccount = accountRepository.findByPhoneNumber(booking.getPatientProfile().getPhoneNumber().trim()).orElse(null);
            }
            if (targetAccount != null) {
                Notification notif = Notification.builder()
                        .account(targetAccount)
                        .title(title)
                        .content(content)
                        .type(type)
                        .isRead(false)
                        .build();
                notificationRepository.save(notif);
            }
        } catch (Exception ignored) {}
    }

    @Override
    @Transactional
    public MedicalRecordResponse startExamination(UUID doctorAccountId, StartExaminationRequest request) {
        Booking booking = bookingRepository.findByBookingCodeForUpdate(request.bookingCode())
                .orElseThrow(() -> new AppException("Không tìm thấy mã đặt khám: " + request.bookingCode(), HttpStatus.NOT_FOUND));

        if (!BookingReceptionTransition.paymentEligible(booking)) {
            throw new AppException("PAYMENT_REQUIRED: Chưa thanh toán tiền khám", HttpStatus.PAYMENT_REQUIRED);
        }
        if (!BookingReceptionTransition.doctorEligible(booking)) {
            throw new AppException("Lượt khám chưa được điều phối hợp lệ", HttpStatus.CONFLICT);
        }

        Doctor doctor = doctorRepository.findByAccount_UserId(doctorAccountId)
                .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin Bác sĩ khám bệnh", HttpStatus.FORBIDDEN));

        // Kiểm tra xem đã có MedicalExaminationRecord cho booking này chưa
        var existingRecord = recordRepository.findByBooking_BookingCode(request.bookingCode());
        if (existingRecord.isPresent()) {
            MedicalExaminationRecord record = existingRecord.get();
            if (request.symptoms() != null && !request.symptoms().isBlank()) {
                record.setSymptoms(request.symptoms());
            }
            if (request.initialDiagnosis() != null && !request.initialDiagnosis().isBlank()) {
                record.setInitialDiagnosis(request.initialDiagnosis());
            }
            record.setState(MedicalExamState.IN_PROGRESS);
            booking.setStatus(BookingStatus.IN_PROGRESS);
            bookingRepository.save(booking);
            return MedicalRecordResponse.fromEntity(recordRepository.save(record));
        }

        MedicalExaminationRecord record = MedicalExaminationRecord.builder()
                .booking(booking)
                .doctor(doctor)
                .patientProfile(booking.getPatientProfile())
                .symptoms(request.symptoms() != null ? request.symptoms() : booking.getSymptoms())
                .initialDiagnosis(request.initialDiagnosis())
                .state(MedicalExamState.IN_PROGRESS)
                .build();

        booking.setStatus(BookingStatus.IN_PROGRESS);
        bookingRepository.save(booking);

        // Gửi thông báo đến đúng bệnh nhân khi Bác sĩ bắt đầu khám
        sendNotificationToPatient(
                booking,
                "🔔 Đã đến lượt khám của bạn!",
                "Kính gửi " + booking.getPatientProfile().getFullName() + ", Bác sĩ " + (doctor.getAccount() != null ? doctor.getAccount().getFullName() : "Bác sĩ phụ trách") + " đã tiếp nhận hồ sơ khám bệnh của bạn. Vui lòng vào buồng khám!",
                "EXAMINATION_START"
        );

        // Tự động gửi thông báo cho 1-3 bệnh nhân sắp đến lượt trong hàng đợi
        try {
            List<Booking> waitingList = bookingRepository.findAllByDoctor_DoctorIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(
                    doctor.getDoctorId(), booking.getBookingDate()
            );
            List<Booking> remainingWaitings = waitingList.stream()
                    .filter(b -> b.getStatus() == BookingStatus.CONFIRMED && !b.getBookingCode().equals(booking.getBookingCode()))
                    .limit(3)
                    .toList();

            for (int i = 0; i < remainingWaitings.size(); i++) {
                Booking wb = remainingWaitings.get(i);
                int count = i + 1;
                String qCode = (Boolean.TRUE.equals(wb.getIsPriority()) ? "UT-" : "KB-") + String.format("%02d", wb.getQueueNumber() != null ? wb.getQueueNumber() : 1);
                sendNotificationToPatient(
                        wb,
                        "🔔 Sắp đến lượt khám! (Còn " + count + " số nữa)",
                        "Kính gửi Ông/Bà " + wb.getPatientProfile().getFullName() + " (STT: " + qCode + "). Chỉ còn " + count + " lượt nữa là đến lượt khám của bạn tại Bàn Khám Bác Sĩ. Vui lòng chuẩn bị di chuyển tới cửa phòng khám!",
                        "QUEUE_ALERT"
                );
            }
        } catch (Exception ignored) {}

        MedicalExaminationRecord saved = recordRepository.save(record);
        auditLogService.log(
                doctorAccountId,
                doctor.getAccount() != null ? doctor.getAccount().getFullName() : "Bác sĩ",
                "ROLE_DOCTOR",
                "START_EXAMINATION",
                "MEDICAL_RECORD",
                saved.getRecordId().toString(),
                "Bắt đầu khám bệnh nhân " + booking.getPatientProfile().getFullName() + " (Mã khám: " + booking.getBookingCode() + ")",
                null
        );
        return MedicalRecordResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public MedicalRecordResponse abandonExaminationAfterTests(UUID recordId, String reason, com.hospital.api.security.UserPrincipal currentUser) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        if (record.isLockedRecord()) {
            throw new AppException("Hồ sơ bệnh án đã bị khóa sau 24h theo Thông tư 46/2018/TT-BYT.", HttpStatus.BAD_REQUEST);
        }

        if (record.getState() == MedicalExamState.DONE) {
            throw new AppException("Ca khám này đã được hoàn tất trước đó.", HttpStatus.BAD_REQUEST);
        }

        // Tự động hủy các xét nghiệm chưa thực hiện (WAITING, SAMPLE_COLLECTED) do bệnh nhân vắng mặt
        if (record.getMedicalTests() != null) {
            for (MedicalTest test : record.getMedicalTests()) {
                if (test.getState() == MedicalTestState.WAITING || test.getState() == MedicalTestState.SAMPLE_COLLECTED) {
                    test.setState(MedicalTestState.CANCELLED);
                    test.setTestResult("Tự động hủy do bệnh nhân vắng mặt/không quay lại: " + (reason != null ? reason : ""));
                    testRepository.save(test);
                }
            }
        }

        String effectiveReason = (reason != null && !reason.isBlank()) ? reason.trim() : "Bệnh nhân không quay lại buồng khám sau khi làm chỉ định cận lâm sàng";
        record.setState(MedicalExamState.DONE);
        record.setCompletedAt(LocalDateTime.now());
        if (record.getFinalDiagnosis() == null || record.getFinalDiagnosis().isBlank()) {
            record.setFinalDiagnosis("Hồ sơ đóng vắng mặt: " + effectiveReason);
        }
        if (record.getTreatmentPlan() == null || record.getTreatmentPlan().isBlank()) {
            record.setTreatmentPlan("Bệnh nhân vắng mặt, chưa nhận tư vấn và đơn thuốc trực tiếp từ bác sĩ.");
        }

        if (record.getBooking() != null) {
            record.getBooking().setStatus(BookingStatus.COMPLETED);
            bookingRepository.save(record.getBooking());
        }

        MedicalExaminationRecord saved = recordRepository.save(record);

        UUID doctorId = currentUser != null ? currentUser.getId() : (record.getDoctor() != null && record.getDoctor().getAccount() != null ? record.getDoctor().getAccount().getUserId() : null);
        String doctorName = currentUser != null ? currentUser.getUsername() : "Bác sĩ";

        auditLogService.log(
                doctorId,
                doctorName,
                "ROLE_DOCTOR",
                "ABANDON_EXAMINATION_AFTER_TESTS",
                "MEDICAL_RECORD",
                saved.getRecordId().toString(),
                "Đóng ca khám vắng mặt cho bệnh nhân [" + (record.getPatientProfile() != null ? record.getPatientProfile().getFullName() : "") + "] với lý do: " + effectiveReason,
                null
        );

        return MedicalRecordResponse.fromEntity(saved);
    }


    @Override
    @Transactional
    public DoctorQueueResponse callPatient(UUID doctorAccountId, String bookingCode) {
        Booking booking = bookingRepository.findByBookingCodeForUpdate(bookingCode)
                .orElseThrow(() -> new AppException("Không tìm thấy mã đặt khám: " + bookingCode, HttpStatus.NOT_FOUND));

        if (!BookingReceptionTransition.paymentEligible(booking)) {
            throw new AppException("PAYMENT_REQUIRED: Chưa thanh toán tiền khám", HttpStatus.PAYMENT_REQUIRED);
        }
        if (!BookingReceptionTransition.doctorEligible(booking)) {
            throw new AppException("Lượt khám chưa được điều phối hợp lệ", HttpStatus.CONFLICT);
        }

        Doctor doctor = doctorRepository.findByAccount_UserId(doctorAccountId)
                .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin Bác sĩ khám bệnh", HttpStatus.FORBIDDEN));

        MedicalExaminationRecord record = recordRepository.findByBooking_BookingCode(bookingCode)
                .orElseGet(() -> recordRepository.save(MedicalExaminationRecord.builder()
                        .booking(booking)
                        .doctor(doctor)
                        .patientProfile(booking.getPatientProfile())
                        .symptoms(booking.getSymptoms())
                        .state(MedicalExamState.WAITING)
                        .build()));

        record.setState(MedicalExamState.CALLING);
        MedicalExaminationRecord saved = recordRepository.save(record);

        sendNotificationToPatient(
                booking,
                "🔔 Mời bạn vào buồng khám!",
                "Kính gửi " + (booking.getPatientProfile() != null ? booking.getPatientProfile().getFullName() : "Bệnh nhân") + ", Bác sĩ " + (doctor.getAccount() != null ? doctor.getAccount().getFullName() : "Bác sĩ phụ trách") + " đang gọi số của bạn. Vui lòng vào buồng khám!",
                "EXAMINATION_CALL"
        );

        return DoctorQueueResponse.fromEntity(booking, saved);
    }

    @Override
    @Transactional
    public DoctorQueueResponse skipPatient(UUID doctorAccountId, String bookingCode) {
        Booking booking = bookingRepository.findByBookingCodeForUpdate(bookingCode)
                .orElseThrow(() -> new AppException("Không tìm thấy mã đặt khám: " + bookingCode, HttpStatus.NOT_FOUND));

        Doctor doctor = doctorRepository.findByAccount_UserId(doctorAccountId)
                .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin Bác sĩ khám bệnh", HttpStatus.FORBIDDEN));

        MedicalExaminationRecord record = recordRepository.findByBooking_BookingCode(bookingCode)
                .orElseGet(() -> recordRepository.save(MedicalExaminationRecord.builder()
                        .booking(booking)
                        .doctor(doctor)
                        .patientProfile(booking.getPatientProfile())
                        .symptoms(booking.getSymptoms())
                        .state(MedicalExamState.WAITING)
                        .build()));

        record.setState(MedicalExamState.SKIPPED);
        MedicalExaminationRecord saved = recordRepository.save(record);

        return DoctorQueueResponse.fromEntity(booking, saved);
    }

    @Override
    @Transactional
    public DoctorQueueResponse recallPatient(UUID doctorAccountId, String bookingCode) {
        Booking booking = bookingRepository.findByBookingCodeForUpdate(bookingCode)
                .orElseThrow(() -> new AppException("Không tìm thấy mã đặt khám: " + bookingCode, HttpStatus.NOT_FOUND));

        Doctor doctor = doctorRepository.findByAccount_UserId(doctorAccountId)
                .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin Bác sĩ khám bệnh", HttpStatus.FORBIDDEN));

        MedicalExaminationRecord record = recordRepository.findByBooking_BookingCode(bookingCode)
                .orElseGet(() -> recordRepository.save(MedicalExaminationRecord.builder()
                        .booking(booking)
                        .doctor(doctor)
                        .patientProfile(booking.getPatientProfile())
                        .symptoms(booking.getSymptoms())
                        .state(MedicalExamState.WAITING)
                        .build()));

        record.setState(MedicalExamState.WAITING);
        MedicalExaminationRecord saved = recordRepository.save(record);

        return DoctorQueueResponse.fromEntity(booking, saved);
    }

    @Override
    @Transactional
    public List<MedicalTestResponse> assignMedicalTests(UUID recordId, AssignMedicalTestRequest request) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        List<MedicalTest> tests = new ArrayList<>();
        for (Integer serviceId : request.serviceIds()) {
            MedicalService service = serviceRepository.findById(serviceId)
                    .orElseThrow(() -> new AppException("Dịch vụ không tồn tại: " + serviceId, HttpStatus.NOT_FOUND));

            MedicalTest test = MedicalTest.builder()
                    .testCode("TEST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .medicalRecord(record)
                    .medicalService(service)
                    .price(service.getPrice())
                    .state(MedicalTestState.WAITING)
                    .build();
            tests.add(test);
        }

        record.setState(MedicalExamState.IN_TESTING);
        recordRepository.save(record);

        // Gửi thông báo chỉ định xét nghiệm đến bệnh nhân
        sendNotificationToPatient(
                record.getBooking(),
                "🧪 Chỉ định Cận lâm sàng mới",
                "Bác sĩ vừa chỉ định " + tests.size() + " dịch vụ xét nghiệm / chẩn đoán hình ảnh. Vui lòng làm theo hướng dẫn của điều dưỡng.",
                "TEST_ASSIGNED"
        );

        return testRepository.saveAll(tests).stream()
                .map(t -> MedicalTestResponse.fromEntity(t, isTestPaid(t)))
                .toList();
    }

    @Override
    @Transactional
    public MedicalTestResponse updateTestResult(UUID testId, UpdateTestResultRequest request) {
        MedicalTest test = testRepository.findById(testId)
                .orElseThrow(() -> new AppException("Không tìm thấy chỉ định xét nghiệm", HttpStatus.NOT_FOUND));

        requireNotCancelled(test);

        if (!isTestPaid(test)) {
            throw new AppException("Chỉ định xét nghiệm [" + test.getTestCode() + "] chưa được thanh toán viện phí! Vui lòng hướng dẫn bệnh nhân thanh toán tại quầy thu ngân trước khi cập nhật kết quả.", HttpStatus.PAYMENT_REQUIRED);
        }

        test.setTestResult(request.testResult());
        test.setResultFileUrl(request.resultFileUrl());
        test.setState(MedicalTestState.COMPLETED);

        // Gửi thông báo có kết quả xét nghiệm đến đúng bệnh nhân
        sendNotificationToPatient(
                test.getMedicalRecord().getBooking(),
                "📋 Đã có kết quả xét nghiệm / CĐHA",
                "Kết quả dịch vụ [" + test.getMedicalService().getServiceName() + "] đã hoàn tất. Bác sĩ đang xem xét kết luận.",
                "TEST_RESULT_READY"
        );

        // Kiểm tra xem tất cả các xét nghiệm của record này đã xong hoặc hủy chưa
        MedicalExaminationRecord record = test.getMedicalRecord();
        boolean allDone = record.getMedicalTests().stream()
                .allMatch(t -> t.getState() == MedicalTestState.COMPLETED || t.getState() == MedicalTestState.CANCELLED);
        if (allDone && record.getState() == MedicalExamState.IN_TESTING) {
            record.setState(MedicalExamState.DIAGNOSING);
            recordRepository.save(record);
        }

        MedicalTest saved = testRepository.save(test);
        return MedicalTestResponse.fromEntity(saved, isTestPaid(saved));
    }

    @Override
    @Transactional
    public MedicalRecordResponse makeDiagnosis(UUID recordId, DiagnosisRequest request) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        if (record.isLockedRecord()) {
            throw new AppException("Hồ sơ bệnh án đã bị khóa sau 24h theo Thông tư 46/2018/TT-BYT. Mọi chỉnh sửa bổ sung phải thông qua Phụ lục bệnh án (Addendum).", HttpStatus.BAD_REQUEST);
        }

        // 1. Kiểm tra toàn bộ xét nghiệm cận lâm sàng (không cho phép hoàn tất nếu còn xét nghiệm chưa hoàn thành hoặc chưa hủy)
        if (record.getMedicalTests() != null && !record.getMedicalTests().isEmpty()) {
            boolean hasUnfinishedTests = record.getMedicalTests().stream()
                    .anyMatch(t -> t.getState() != MedicalTestState.COMPLETED && t.getState() != MedicalTestState.CANCELLED);
            if (hasUnfinishedTests) {
                throw new AppException("Không thể hoàn tất ca khám do bệnh nhân vẫn còn chỉ định cận lâm sàng chưa hoàn thành hoặc chưa được hủy!", HttpStatus.BAD_REQUEST);
            }
        }


        record.setFinalDiagnosis(request.finalDiagnosis());
        record.setTreatmentPlan(request.treatmentPlan());
        record.setReExaminationDate(request.reExaminationDate());
        if (record.getState() == MedicalExamState.WAITING || record.getState() == MedicalExamState.IN_TESTING) {
            record.setState(MedicalExamState.DIAGNOSING);
        }

        // Nếu bác sĩ truyền danh sách mã bệnh ICD-10 cấu trúc
        if (request.conditions() != null && !request.conditions().isEmpty()) {
            for (var condReq : request.conditions()) {
                MedicalCondition cond = MedicalCondition.builder()
                        .medicalRecord(record)
                        .icd10Code(condReq.icd10Code().trim().toUpperCase())
                        .diseaseName(condReq.diseaseName().trim())
                        .conditionType(condReq.conditionType() != null ? condReq.conditionType() : ConditionType.PRIMARY)
                        .clinicalStatus(condReq.clinicalStatus() != null ? condReq.clinicalStatus() : "ACTIVE")
                        .notes(condReq.notes())
                        .build();
                conditionRepository.save(cond);
                record.getMedicalConditions().add(cond);
            }
        }

        // Gửi thông báo kết luận chẩn đoán đến đúng bệnh nhân
        String notifTitle = request.reExaminationDate() != null ? "🩺 Kết luận chẩn đoán & Hẹn ngày tái khám" : "🩺 Đã có kết luận chẩn đoán";
        String notifMsg = "Bác sĩ đã kết luận chẩn đoán: " + request.finalDiagnosis() + ". Kế hoạch: " + (request.treatmentPlan() != null ? request.treatmentPlan() : "Xem chi tiết trong bệnh án.");
        if (request.reExaminationDate() != null) {
            notifMsg += " 📅 Ngày hẹn tái khám: " + request.reExaminationDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        sendNotificationToPatient(
                record.getBooking(),
                notifTitle,
                notifMsg,
                "DIAGNOSIS_COMPLETED"
        );

        MedicalExaminationRecord saved = recordRepository.save(record);
        auditLogService.log(
                record.getDoctor() != null && record.getDoctor().getAccount() != null ? record.getDoctor().getAccount().getUserId() : null,
                record.getDoctor() != null && record.getDoctor().getAccount() != null ? record.getDoctor().getAccount().getFullName() : "Bác sĩ",
                "ROLE_DOCTOR",
                "MAKE_DIAGNOSIS",
                "MEDICAL_RECORD",
                saved.getRecordId().toString(),
                "Kết luận chẩn đoán: " + saved.getFinalDiagnosis() + " cho bệnh nhân " + (saved.getPatientProfile() != null ? saved.getPatientProfile().getFullName() : ""),
                null
        );
        return MedicalRecordResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public MedicalRecordResponse completeExamination(UUID recordId, CompleteExaminationRequest request) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        if (record.isLockedRecord()) {
            throw new AppException("Hồ sơ bệnh án đã bị khóa sau 24h theo Thông tư 46/2018/TT-BYT. Mọi chỉnh sửa bổ sung phải thông qua Phụ lục bệnh án (Addendum).", HttpStatus.BAD_REQUEST);
        }

        if (request != null) {
            if (request.finalDiagnosis() != null && !request.finalDiagnosis().isBlank()) {
                record.setFinalDiagnosis(request.finalDiagnosis().trim());
            }
            if (request.treatmentPlan() != null && !request.treatmentPlan().isBlank()) {
                record.setTreatmentPlan(request.treatmentPlan().trim());
            }
            if (request.reExaminationDate() != null) {
                record.setReExaminationDate(request.reExaminationDate());
            }
            if (request.conditions() != null && !request.conditions().isEmpty()) {
                for (ConditionInputRequest condReq : request.conditions()) {
                    if (condReq.diseaseName() != null && !condReq.diseaseName().isBlank()) {
                        MedicalCondition cond = MedicalCondition.builder()
                                .medicalRecord(record)
                                .icd10Code(condReq.icd10Code() != null ? condReq.icd10Code().trim().toUpperCase() : null)
                                .diseaseName(condReq.diseaseName().trim())
                                .conditionType(condReq.conditionType() != null ? condReq.conditionType() : ConditionType.PRIMARY)
                                .clinicalStatus(condReq.clinicalStatus() != null ? condReq.clinicalStatus() : "ACTIVE")
                                .notes(condReq.notes())
                                .build();
                        conditionRepository.save(cond);
                        record.getMedicalConditions().add(cond);
                    }
                }
            }
        }

        if (record.getFinalDiagnosis() == null || record.getFinalDiagnosis().isBlank()) {
            throw new AppException("Bác sĩ phải nhập kết luận chẩn đoán lâm sàng xác định trước khi hoàn tất hồ sơ khám bệnh!", HttpStatus.BAD_REQUEST);
        }

        // Chuyển trạng thái hồ sơ sang DONE và booking sang COMPLETED
        record.setState(MedicalExamState.DONE);
        record.setCompletedAt(LocalDateTime.now());
        if (record.getBooking() != null) {
            record.getBooking().setStatus(BookingStatus.COMPLETED);
            bookingRepository.save(record.getBooking());
        }

        MedicalExaminationRecord saved = recordRepository.save(record);

        // Gửi thông báo hoàn tất ca khám cho bệnh nhân
        sendNotificationToPatient(
                record.getBooking(),
                "🎉 Buổi khám bệnh đã hoàn tất",
                "Buổi khám bệnh của bạn đã hoàn tất với chẩn đoán: [" + saved.getFinalDiagnosis() + "]. Chúc bạn luôn dồi dào sức khỏe!",
                "EXAM_COMPLETED"
        );

        auditLogService.log(
                record.getDoctor() != null && record.getDoctor().getAccount() != null ? record.getDoctor().getAccount().getUserId() : null,
                record.getDoctor() != null && record.getDoctor().getAccount() != null ? record.getDoctor().getAccount().getFullName() : "Bác sĩ",
                "ROLE_DOCTOR",
                "COMPLETE_EXAMINATION",
                "MEDICAL_RECORD",
                saved.getRecordId().toString(),
                "Hoàn tất ca khám cho bệnh nhân " + (saved.getPatientProfile() != null ? saved.getPatientProfile().getFullName() : "") + " (Chẩn đoán: " + saved.getFinalDiagnosis() + ")",
                null
        );

        return MedicalRecordResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public PrescriptionResponse createPrescription(UUID recordId, CreatePrescriptionRequest request) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        if (record.isLockedRecord()) {
            throw new AppException("Hồ sơ bệnh án đã bị khóa sau 24h theo Thông tư 46/2018/TT-BYT. Mọi chỉnh sửa bổ sung phải thông qua Phụ lục bệnh án (Addendum).", HttpStatus.BAD_REQUEST);
        }

        // Kiểm tra an toàn dược lý & dị ứng chéo (CDS Drug Safety Check - tham khảo E-healthcare)
        DrugSafetyCheckResponse safetyCheck = checkPrescriptionSafety(
                recordId,
                new CheckPrescriptionSafetyRequest(request.items(), null)
        );
        if (safetyCheck.criticalCount() > 0 && !Boolean.TRUE.equals(request.overrideAllergyWarning())) {
            String firstAlert = !safetyCheck.warnings().isEmpty() ? safetyCheck.warnings().get(0).warningMessage() : "Phát hiện nguy cơ dị ứng thuốc nguy hiểm";
            throw new AppException(
                    "CẢNH BÁO AN TOÀN DƯỢC LÝ: " + firstAlert + " Vui lòng đổi thuốc an toàn hoặc xác nhận ghi đè lâm sàng (overrideAllergyWarning) nếu có chỉ định đặc biệt từ Bác sĩ.",
                    HttpStatus.BAD_REQUEST
            );
        }
        if (safetyCheck.criticalCount() > 0 && Boolean.TRUE.equals(request.overrideAllergyWarning())) {
            log.warn("BÁC SĨ GHI ĐÈ CẢNH BÁO DỊ ỨNG: Bác sĩ đã xác nhận ghi đè lâm sàng cho hồ sơ {} với {} cảnh báo nguy hiểm", recordId, safetyCheck.criticalCount());
        }

        Prescription prescription = Prescription.builder()
                .prescriptionCode("RX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .medicalRecord(record)
                .doctorNotes(request.doctorNotes())
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        List<PrescriptionItem> items = new ArrayList<>();

        for (PrescriptionItemRequest itemReq : request.items()) {
            Medicine medicine = medicineRepository.findById(itemReq.medicineId())
                    .orElseThrow(() -> new AppException("Thuốc không tồn tại với ID: " + itemReq.medicineId(), HttpStatus.NOT_FOUND));

            // Kiểm tra tồn kho
            if (medicine.getStockQuantity() < itemReq.quantity()) {
                throw new AppException("Thuốc [" + medicine.getMedicineName() + "] không đủ số lượng tồn kho (Hiện còn: " + medicine.getStockQuantity() + ")", HttpStatus.BAD_REQUEST);
            }

            BigDecimal itemTotal = medicine.getPrice().multiply(BigDecimal.valueOf(itemReq.quantity()));
            total = total.add(itemTotal);

            PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(prescription)
                    .medicine(medicine)
                    .quantity(itemReq.quantity())
                    .unitPrice(medicine.getPrice())
                    .totalPrice(itemTotal)
                    .morningAmount(itemReq.morningAmount())
                    .noonAmount(itemReq.noonAmount())
                    .afternoonAmount(itemReq.afternoonAmount())
                    .eveningAmount(itemReq.eveningAmount())
                    .dosageInstruction(itemReq.dosageInstruction())
                    .build();

            items.add(item);
        }

        prescription.setTotalAmount(total);
        prescription.setPrescriptionItems(items);
        Prescription savedPrescription = prescriptionRepository.save(prescription);

        record.setState(MedicalExamState.DONE);
        if (record.getBooking() != null) {
            record.getBooking().setStatus(BookingStatus.COMPLETED);
            bookingRepository.save(record.getBooking());
        }
        if (record.getCompletedAt() == null) {
            record.setCompletedAt(LocalDateTime.now());
        }
        recordRepository.save(record);

        // Gửi thông báo đơn thuốc đến bệnh nhân
        sendNotificationToPatient(
                record.getBooking(),
                "💊 Đã có đơn thuốc khám bệnh",
                "Toa thuốc mã [" + savedPrescription.getPrescriptionCode() + "] đã được kê gồm " + items.size() + " loại thuốc. Tổng tiền: " + savedPrescription.getTotalAmount() + " VNĐ.",
                "PRESCRIPTION_DONE"
        );

        // Ghi Audit Log kê đơn thuốc
        auditLogService.log(
                record.getDoctor() != null && record.getDoctor().getAccount() != null ? record.getDoctor().getAccount().getUserId() : null,
                record.getDoctor() != null && record.getDoctor().getAccount() != null ? record.getDoctor().getAccount().getFullName() : "Bác sĩ",
                "ROLE_DOCTOR",
                "CREATE_PRESCRIPTION",
                "PRESCRIPTION",
                savedPrescription.getPrescriptionId().toString(),
                "Kê đơn thuốc " + savedPrescription.getPrescriptionCode() + " gồm " + items.size() + " loại thuốc cho hồ sơ " + record.getRecordId(),
                null
        );

        return PrescriptionResponse.fromEntity(savedPrescription);
    }

    @Override
    public DrugSafetyCheckResponse checkPrescriptionSafety(UUID recordId, CheckPrescriptionSafetyRequest request) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        String rawAllergies = "";
        if (request.patientAllergies() != null && !request.patientAllergies().trim().isEmpty()) {
            rawAllergies = request.patientAllergies().trim();
        } else {
            // Tự động kiểm tra triệu chứng, ghi chú bệnh án xem có ghi nhận dị ứng không
            StringBuilder sb = new StringBuilder();
            if (record.getSymptoms() != null && record.getSymptoms().toLowerCase().contains("dị ứng")) {
                sb.append(record.getSymptoms()).append(" ");
            }
            if (record.getTreatmentPlan() != null && record.getTreatmentPlan().toLowerCase().contains("dị ứng")) {
                sb.append(record.getTreatmentPlan()).append(" ");
            }
            rawAllergies = sb.toString().trim();
        }

        List<DrugSafetyWarningDto> warnings = new ArrayList<>();
        String cleanAllergy = rawAllergies.toLowerCase().trim();
        boolean hasAllergy = !cleanAllergy.isEmpty()
                && !cleanAllergy.contains("chưa ghi nhận")
                && !cleanAllergy.contains("không có")
                && !cleanAllergy.contains("không dị ứng")
                && !cleanAllergy.equals("none");

        if (hasAllergy && request.items() != null) {
            String[] tokens = cleanAllergy.split("[,;+\\n/]+");
            for (PrescriptionItemRequest itemReq : request.items()) {
                Medicine medicine = medicineRepository.findById(itemReq.medicineId()).orElse(null);
                if (medicine == null) continue;

                String medName = (medicine.getMedicineName() != null ? medicine.getMedicineName().toLowerCase() : "");
                String activeIng = (medicine.getActiveIngredient() != null ? medicine.getActiveIngredient().toLowerCase() : "");

                for (String rawToken : tokens) {
                    String token = rawToken.trim();
                    if (token.length() < 2) continue;

                    // 1. Kiểm tra đối chiếu qua nhóm phản ứng chéo dược lý (ALLERGY_GROUP_TARGETS)
                    boolean matched = false;
                    for (Map.Entry<String, List<String>> entry : ALLERGY_GROUP_TARGETS.entrySet()) {
                        String groupKey = entry.getKey();
                        List<String> targets = entry.getValue();

                        if (token.contains(groupKey) || targets.stream().anyMatch(token::contains)) {
                            if (targets.stream().anyMatch(tg -> medName.contains(tg) || activeIng.contains(tg))) {
                                warnings.add(DrugSafetyWarningDto.builder()
                                        .medicineId(medicine.getMedicineId())
                                        .medicineName(medicine.getMedicineName())
                                        .activeIngredient(medicine.getActiveIngredient())
                                        .matchedAllergy(token)
                                        .warningLevel("CRITICAL")
                                        .warningMessage("CẢNH BÁO NGUY HIỂM: Bệnh nhân có tiền sử dị ứng nhóm [" + groupKey.toUpperCase() + "] (" + token + "), trùng khớp với thuốc/hoạt chất [" + medicine.getMedicineName() + "]! Nguy cơ sốc phản vệ hoặc co thắt phế quản cấp tính.")
                                        .build());
                                matched = true;
                                break;
                            }
                        }
                    }

                    // 2. Kiểm tra đối chiếu xâu ký tự trực tiếp
                    if (!matched && token.length() >= 3) {
                        if (medName.contains(token) || (!activeIng.isEmpty() && activeIng.contains(token))) {
                            warnings.add(DrugSafetyWarningDto.builder()
                                    .medicineId(medicine.getMedicineId())
                                    .medicineName(medicine.getMedicineName())
                                    .activeIngredient(medicine.getActiveIngredient())
                                    .matchedAllergy(token)
                                    .warningLevel("CRITICAL")
                                    .warningMessage("CẢNH BÁO NGUY HIỂM: Bệnh nhân có tiền sử dị ứng với [" + token + "], trùng khớp với thuốc [" + medicine.getMedicineName() + "]!")
                                    .build());
                            break;
                        }
                    }
                }
            }
        }

        int criticalCount = (int) warnings.stream().filter(w -> "CRITICAL".equalsIgnoreCase(w.warningLevel())).count();
        int warningCount = warnings.size() - criticalCount;
        boolean safe = warnings.isEmpty();
        String summary = safe ? "Đơn thuốc an toàn dược lý, không phát hiện nguy cơ dị ứng đối với bệnh nhân."
                : "Phát hiện " + warnings.size() + " cảnh báo an toàn dược lý đối với bệnh nhân!";

        return DrugSafetyCheckResponse.builder()
                .safe(safe)
                .criticalCount(criticalCount)
                .warningCount(warningCount)
                .warnings(warnings)
                .summaryMessage(summary)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public MedicalRecordResponse getRecordById(UUID recordId) {
        return getRecordById(recordId, null, true);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicalRecordResponse getRecordById(UUID recordId, UUID currentUserId, boolean isStaff) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        if (!isStaff) {
            if (record.getPatientProfile() == null
                    || record.getPatientProfile().getAccount() == null
                    || !record.getPatientProfile().getAccount().getUserId().equals(currentUserId)) {
                throw new AppException("Bạn không có quyền truy cập hồ sơ bệnh án này", HttpStatus.FORBIDDEN);
            }
        } else if (currentUserId != null) {
            // Ràng buộc Trưởng khoa: Chỉ được xem hồ sơ bệnh án thuộc chuyên khoa của mình
            accountRepository.findById(currentUserId).ifPresent(acc -> {
                if (acc.getRole() == Role.ROLE_HEAD_OF_DEPARTMENT) {
                    Doctor headDoc = doctorRepository.findByAccount_UserId(currentUserId).orElse(null);
                    if (headDoc != null && headDoc.getDepartment() != null) {
                        Integer headDeptId = headDoc.getDepartment().getDepartmentId();
                        Integer recordDeptId = null;
                        if (record.getDoctor() != null && record.getDoctor().getDepartment() != null) {
                            recordDeptId = record.getDoctor().getDepartment().getDepartmentId();
                        } else if (record.getBooking() != null && record.getBooking().getDoctor() != null && record.getBooking().getDoctor().getDepartment() != null) {
                            recordDeptId = record.getBooking().getDoctor().getDepartment().getDepartmentId();
                        }
                        if (recordDeptId != null && !recordDeptId.equals(headDeptId)) {
                            throw new AppException("Trưởng khoa chỉ có quyền xem hồ sơ bệnh án thuộc chuyên khoa của mình", HttpStatus.FORBIDDEN);
                        }
                    }
                }
            });
        }

        return MedicalRecordResponse.fromEntity(record);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicalRecordResponse getRecordByBookingCode(String bookingCode, UUID currentUserId, boolean isStaff) {
        MedicalExaminationRecord record = recordRepository.findByBooking_BookingCode(bookingCode)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh án cho mã khám " + bookingCode, HttpStatus.NOT_FOUND));

        if (!isStaff) {
            if (record.getPatientProfile() == null
                    || record.getPatientProfile().getAccount() == null
                    || !record.getPatientProfile().getAccount().getUserId().equals(currentUserId)) {
                throw new AppException("Bạn không có quyền truy cập hồ sơ bệnh án này", HttpStatus.FORBIDDEN);
            }
        } else if (currentUserId != null) {
            // Ràng buộc Trưởng khoa: Chỉ được xem hồ sơ bệnh án thuộc chuyên khoa của mình
            accountRepository.findById(currentUserId).ifPresent(acc -> {
                if (acc.getRole() == Role.ROLE_HEAD_OF_DEPARTMENT) {
                    Doctor headDoc = doctorRepository.findByAccount_UserId(currentUserId).orElse(null);
                    if (headDoc != null && headDoc.getDepartment() != null) {
                        Integer headDeptId = headDoc.getDepartment().getDepartmentId();
                        Integer recordDeptId = null;
                        if (record.getDoctor() != null && record.getDoctor().getDepartment() != null) {
                            recordDeptId = record.getDoctor().getDepartment().getDepartmentId();
                        } else if (record.getBooking() != null && record.getBooking().getDoctor() != null && record.getBooking().getDoctor().getDepartment() != null) {
                            recordDeptId = record.getBooking().getDoctor().getDepartment().getDepartmentId();
                        }
                        if (recordDeptId != null && !recordDeptId.equals(headDeptId)) {
                            throw new AppException("Trưởng khoa chỉ có quyền xem hồ sơ bệnh án thuộc chuyên khoa của mình", HttpStatus.FORBIDDEN);
                        }
                    }
                }
            });
        }

        return MedicalRecordResponse.fromEntity(record);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getRecordsByPatientProfile(UUID patientProfileId, UUID currentUserId, boolean isStaff) {
        List<MedicalExaminationRecord> records = recordRepository
                .findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(patientProfileId);

        if (!isStaff && !records.isEmpty()) {
            MedicalExaminationRecord first = records.get(0);
            if (first.getPatientProfile() == null
                    || first.getPatientProfile().getAccount() == null
                    || !first.getPatientProfile().getAccount().getUserId().equals(currentUserId)) {
                throw new AppException("Bạn không có quyền truy cập hồ sơ bệnh án này", HttpStatus.FORBIDDEN);
            }
        } else if (currentUserId != null) {
            // Ràng buộc Trưởng khoa: Chỉ được xem các bệnh án thuộc chuyên khoa của mình
            Account callerAcc = accountRepository.findById(currentUserId).orElse(null);
            if (callerAcc != null && callerAcc.getRole() == Role.ROLE_HEAD_OF_DEPARTMENT) {
                Doctor headDoc = doctorRepository.findByAccount_UserId(currentUserId).orElse(null);
                if (headDoc != null && headDoc.getDepartment() != null) {
                    final Integer headDeptId = headDoc.getDepartment().getDepartmentId();
                    records = records.stream()
                            .filter(r -> {
                                Integer rDeptId = null;
                                if (r.getDoctor() != null && r.getDoctor().getDepartment() != null) {
                                    rDeptId = r.getDoctor().getDepartment().getDepartmentId();
                                } else if (r.getBooking() != null && r.getBooking().getDoctor() != null && r.getBooking().getDoctor().getDepartment() != null) {
                                    rDeptId = r.getBooking().getDoctor().getDepartment().getDepartmentId();
                                }
                                return rDeptId != null && rDeptId.equals(headDeptId);
                            })
                            .toList();
                }
            }
        }

        return records.stream().map(MedicalRecordResponse::fromEntity).toList();
    }

    private int getQueueRank(DoctorQueueResponse item) {
        if (item.status() == BookingStatus.IN_PROGRESS || item.recordState() == MedicalExamState.IN_PROGRESS) {
            return 1; // Ca đang khám trong phòng (ưu tiên số 1)
        }
        if (item.recordState() == MedicalExamState.CALLING) {
            return 2; // Ca đang được Bác sĩ gọi vào phòng (ưu tiên số 2)
        }
        if (Boolean.TRUE.equals(item.isReturnAfterResult())) {
            return 3; // Ca đã có kết quả cận lâm sàng quay lại buồng khám (RETURN_AFTER_RESULT)
        }
        if (Boolean.TRUE.equals(item.isPriority()) && item.status() == BookingStatus.CONFIRMED && item.recordState() != MedicalExamState.SKIPPED) {
            return 4; // Bệnh nhân diện ưu tiên chính sách chưa khám
        }
        if ((item.status() == BookingStatus.CONFIRMED || item.status() == BookingStatus.PENDING_PAYMENT) && item.recordState() != MedicalExamState.SKIPPED) {
            return 5; // Bệnh nhân thường chưa khám
        }
        if (item.recordState() == MedicalExamState.SKIPPED) {
            return 6; // Bệnh nhân vắng mặt / Bỏ qua tạm thời (xếp cuối hàng chờ)
        }
        return 7; // Ca đã hoàn tất hoặc đã hủy
    }

    @Override
    public List<DoctorQueueResponse> getDoctorQueue(UUID doctorAccountId, LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        List<Booking> bookings = bookingRepository.findAllByDoctor_Account_UserIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(doctorAccountId, queryDate);
        return bookings.stream()
                .filter(BookingReceptionTransition::doctorEligible)
                .map(b -> {
                    var recordOpt = recordRepository.findByBooking_BookingCode(b.getBookingCode());
                    return DoctorQueueResponse.fromEntity(b, recordOpt.orElse(null));
                })
                .sorted((a, b) -> {
                    int rankA = getQueueRank(a);
                    int rankB = getQueueRank(b);
                    if (rankA != rankB) {
                        return Integer.compare(rankA, rankB);
                    }
                    int qA = a.queueNumber() != null ? a.queueNumber() : 9999;
                    int qB = b.queueNumber() != null ? b.queueNumber() : 9999;
                    return Integer.compare(qA, qB);
                })
                .toList();
    }

    @Override
    public List<DoctorQueueResponse> getPublicQueue(LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        List<Booking> bookings = bookingRepository.findAllByBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(queryDate);
        return bookings.stream()
                .filter(BookingReceptionTransition::doctorEligible)
                .map(b -> {
                    var recordOpt = recordRepository.findByBooking_BookingCode(b.getBookingCode());
                    return DoctorQueueResponse.toPublicEntity(b, recordOpt.orElse(null));
                })
                .sorted((a, b) -> {
                    int rankA = getQueueRank(a);
                    int rankB = getQueueRank(b);
                    if (rankA != rankB) {
                        return Integer.compare(rankA, rankB);
                    }
                    int qA = a.queueNumber() != null ? a.queueNumber() : 9999;
                    int qB = b.queueNumber() != null ? b.queueNumber() : 9999;
                    return Integer.compare(qA, qB);
                })
                .toList();
    }


    @Override
    public List<LabTestDetailResponse> getLabTests(MedicalTestState state) {
        List<MedicalTest> tests;
        if (state != null) {
            tests = testRepository.findAllByStateAndDeletedFalseOrderByCreatedAtDesc(state);
        } else {
            tests = testRepository.findAllByDeletedFalseOrderByCreatedAtDesc();
        }
        return tests.stream().map(t -> LabTestDetailResponse.fromEntity(t, isTestPaid(t))).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LabTestDetailResponse getLabTestById(UUID testId) {
        MedicalTest test = testRepository.findById(testId)
                .orElseThrow(() -> new AppException("Không tìm thấy chỉ định xét nghiệm với ID: " + testId, HttpStatus.NOT_FOUND));
        return LabTestDetailResponse.fromEntity(test, isTestPaid(test));
    }

    @Override
    @Transactional
    public LabTestDetailResponse collectSpecimen(UUID testId, CollectSpecimenRequest request) {
        MedicalTest test = testRepository.findById(testId)
                .orElseThrow(() -> new AppException("Không tìm thấy chỉ định xét nghiệm", HttpStatus.NOT_FOUND));

        requireNotCancelled(test);

        if (!isTestPaid(test)) {
            throw new AppException("Chỉ định xét nghiệm [" + test.getTestCode() + "] chưa được thanh toán viện phí! Vui lòng hướng dẫn bệnh nhân thanh toán tại quầy thu ngân trước khi lấy mẫu bệnh phẩm.", HttpStatus.PAYMENT_REQUIRED);
        }

        test.setSpecimenType(request.specimenType());
        if (request.specimenBarcode() != null && !request.specimenBarcode().isBlank()) {
            test.setSpecimenBarcode(request.specimenBarcode().trim());
        } else if (test.getSpecimenBarcode() == null) {
            test.setSpecimenBarcode("BAR-" + LocalDate.now().toString().replace("-", "") + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }
        test.setSampleCollectedAt(java.time.LocalDateTime.now());

        if (request.collectorStaffId() != null) {
            staffRepository.findById(request.collectorStaffId()).ifPresent(test::setSampleCollectedBy);
        }

        test.setState(MedicalTestState.SAMPLE_COLLECTED);
        MedicalTest saved = testRepository.save(test);

        // Gửi thông báo đến bệnh nhân
        sendNotificationToPatient(
                test.getMedicalRecord().getBooking(),
                "🩸 Đã tiếp nhận & lấy mẫu xét nghiệm",
                "Phòng xét nghiệm đã tiếp nhận mẫu bệnh phẩm [" + test.getSpecimenType() + "] (Mã vạch: " + test.getSpecimenBarcode() + "). Đang tiến hành phân tích.",
                "SAMPLE_COLLECTED"
        );

        return LabTestDetailResponse.fromEntity(saved, isTestPaid(saved));
    }

    private com.hospital.api.constant.TestResultFlag evaluateResultFlag(BigDecimal value, String referenceRange) {
        if (value == null || referenceRange == null || referenceRange.isBlank()) return null;
        try {
            String clean = referenceRange.trim().replace(",", ".");
            if (clean.contains("-")) {
                String[] parts = clean.split("-");
                if (parts.length == 2) {
                    BigDecimal low = new BigDecimal(parts[0].replaceAll("[^0-9.]", "").trim());
                    BigDecimal high = new BigDecimal(parts[1].replaceAll("[^0-9.]", "").trim());
                    if (value.compareTo(low) < 0) return com.hospital.api.constant.TestResultFlag.LOW;
                    if (value.compareTo(high) > 0) return com.hospital.api.constant.TestResultFlag.HIGH;
                    return com.hospital.api.constant.TestResultFlag.NORMAL;
                }
            } else if (clean.startsWith("<") || clean.startsWith("<=")) {
                BigDecimal threshold = new BigDecimal(clean.replaceAll("[^0-9.]", "").trim());
                if (value.compareTo(threshold) > 0) return com.hospital.api.constant.TestResultFlag.HIGH;
                return com.hospital.api.constant.TestResultFlag.NORMAL;
            } else if (clean.startsWith(">") || clean.startsWith(">=")) {
                BigDecimal threshold = new BigDecimal(clean.replaceAll("[^0-9.]", "").trim());
                if (value.compareTo(threshold) < 0) return com.hospital.api.constant.TestResultFlag.LOW;
                return com.hospital.api.constant.TestResultFlag.NORMAL;
            }
        } catch (Exception ignored) {}
        return null;
    }

    @Override
    @Transactional
    public LabTestDetailResponse saveDetailedTestResult(UUID testId, SaveDetailedTestResultRequest request) {
        MedicalTest test = testRepository.findById(testId)
                .orElseThrow(() -> new AppException("Không tìm thấy chỉ định xét nghiệm", HttpStatus.NOT_FOUND));

        requireNotCancelled(test);

        if (!isTestPaid(test)) {
            throw new AppException("Chỉ định xét nghiệm [" + test.getTestCode() + "] chưa được thanh toán viện phí! Không thể nhập kết quả xét nghiệm.", HttpStatus.PAYMENT_REQUIRED);
        }

        test.setTestResult(request.testResult());
        test.setResultFileUrl(request.resultFileUrl());
        test.setCompletedAt(java.time.LocalDateTime.now());
        test.setState(MedicalTestState.COMPLETED);

        if (request.performerStaffId() != null) {
            staffRepository.findById(request.performerStaffId()).ifPresent(test::setPerformedBy);
        }

        // Cập nhật kết quả chi tiết từng chỉ số
        test.getResultItems().clear();
        for (var itemDto : request.items()) {
            com.hospital.api.constant.TestResultFlag flag = itemDto.flag();
            if (flag == null && itemDto.valueNumeric() != null && itemDto.referenceRange() != null) {
                flag = evaluateResultFlag(itemDto.valueNumeric(), itemDto.referenceRange());
            }

            MedicalTestResultItem item = MedicalTestResultItem.builder()
                    .medicalTest(test)
                    .parameterCode(itemDto.parameterCode().trim().toUpperCase())
                    .parameterName(itemDto.parameterName().trim())
                    .valueNumeric(itemDto.valueNumeric())
                    .valueText(itemDto.valueText())
                    .unit(itemDto.unit())
                    .referenceRange(itemDto.referenceRange())
                    .flag(flag)
                    .notes(itemDto.notes())
                    .build();
            test.getResultItems().add(item);
        }

        MedicalTest savedTest = testRepository.save(test);

        // TỰ ĐỘNG ĐỒNG BỘ VỀ HỒ SƠ BỆNH ÁN ĐIỆN TỬ (EHR - OpenMRS Concept & Observation)
        boolean shouldSync = request.autoSyncToEhr() == null || request.autoSyncToEhr();
        if (shouldSync) {
            MedicalExaminationRecord record = test.getMedicalRecord();
            for (var itemDto : request.items()) {
                String code = itemDto.parameterCode().trim().toUpperCase();
                MedicalConcept concept = conceptRepository.findByConceptCode(code).orElseGet(() -> {
                    ConceptDataType dtype = itemDto.valueNumeric() != null ? ConceptDataType.NUMERIC : ConceptDataType.TEXT;
                    MedicalConcept newConcept = MedicalConcept.builder()
                            .conceptCode(code)
                            .name(itemDto.parameterName().trim())
                            .dataType(dtype)
                            .unit(itemDto.unit())
                            .build();
                    return conceptRepository.save(newConcept);
                });

                String interpretation = itemDto.flag() != null ? itemDto.flag().name() : "NORMAL";

                MedicalObservation obs = MedicalObservation.builder()
                        .medicalRecord(record)
                        .concept(concept)
                        .valueNumeric(itemDto.valueNumeric())
                        .valueText(itemDto.valueText())
                        .interpretation(interpretation)
                        .recordedAt(java.time.LocalDateTime.now())
                        .comments("Đồng bộ tự động từ LIS - " + test.getMedicalService().getServiceName() + " (Mã: " + test.getTestCode() + ")")
                        .build();

                observationRepository.save(obs);
                record.getMedicalObservations().add(obs);
            }
        }

        // Kiểm tra xem tất cả các xét nghiệm của record này đã xong hoặc hủy chưa
        MedicalExaminationRecord record = test.getMedicalRecord();
        boolean allDone = record.getMedicalTests().stream()
                .allMatch(t -> t.getState() == MedicalTestState.COMPLETED || t.getState() == MedicalTestState.CANCELLED);
        if (allDone && record.getState() == MedicalExamState.IN_TESTING) {
            record.setState(MedicalExamState.DIAGNOSING);
            recordRepository.save(record);
        }

        // Gửi thông báo đến bệnh nhân
        sendNotificationToPatient(
                record.getBooking(),
                "📋 Đã có kết quả xét nghiệm chi tiết",
                "Kết quả dịch vụ [" + test.getMedicalService().getServiceName() + "] đã hoàn tất phân tích với " + request.items().size() + " chỉ số. Bác sĩ đang xem xét chẩn đoán.",
                "TEST_RESULT_READY"
        );

        // Ghi Audit Log cập nhật kết quả xét nghiệm LIS
        Staff performer = test.getPerformedBy();
        auditLogService.log(
                performer != null ? performer.getStaffId() : null,
                performer != null ? performer.getFullName() : "KTV Lab",
                "ROLE_LAB_TECHNICIAN",
                "SAVE_TEST_RESULT",
                "MEDICAL_TEST",
                savedTest.getMedicalTestId().toString(),
                "Nhập kết quả xét nghiệm " + test.getTestCode() + " (" + test.getMedicalService().getServiceName() + ") với " + request.items().size() + " chỉ số",
                null
        );

        return LabTestDetailResponse.fromEntity(savedTest, isTestPaid(savedTest));
    }

    @Override
    @Transactional
    public MedicalTestResponse cancelMedicalTest(UUID testId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new AppException("Lý do hủy chỉ định xét nghiệm không được để trống", HttpStatus.BAD_REQUEST);
        }
        MedicalTest test = testRepository.findById(testId)
                .orElseThrow(() -> new AppException("Không tìm thấy chỉ định xét nghiệm", HttpStatus.NOT_FOUND));

        if (test.getState() == MedicalTestState.COMPLETED) {
            throw new AppException("Không thể hủy chỉ định xét nghiệm đã có kết quả hoàn tất!", HttpStatus.BAD_REQUEST);
        }
        if (test.getState() == MedicalTestState.CANCELLED) {
            return MedicalTestResponse.fromEntity(test, isTestPaid(test));
        }

        test.setState(MedicalTestState.CANCELLED);
        String cancelNote = "[ĐÃ HỦY CHỈ ĐỊNH]: " + reason.trim();
        test.setTestResult(cancelNote);
        MedicalTest saved = testRepository.save(test);

        // Kiểm tra xem các xét nghiệm còn lại đã hoàn tất hoặc bị hủy hết chưa để chuyển sang DIAGNOSING
        MedicalExaminationRecord record = test.getMedicalRecord();
        if (record != null && record.getMedicalTests() != null) {
            boolean allDone = record.getMedicalTests().stream()
                    .allMatch(t -> t.getState() == MedicalTestState.COMPLETED || t.getState() == MedicalTestState.CANCELLED);
            if (allDone && record.getState() == MedicalExamState.IN_TESTING) {
                record.setState(MedicalExamState.DIAGNOSING);
                recordRepository.save(record);
            }
        }

        auditLogService.log(
                null,
                "Bác sĩ / KTV",
                "ROLE_DOCTOR",
                "CANCEL_MEDICAL_TEST",
                "MEDICAL_TEST",
                test.getMedicalTestId().toString(),
                "Hủy chỉ định xét nghiệm " + test.getMedicalService().getServiceName() + ". Lý do: " + cancelNote,
                null
        );

        return MedicalTestResponse.fromEntity(saved, isTestPaid(saved));
    }

    private void requireNotCancelled(MedicalTest test) {
        if (test.getState() == MedicalTestState.CANCELLED) {
            throw new AppException("Không thể thực hiện chỉ định xét nghiệm đã hủy", HttpStatus.BAD_REQUEST);
        }
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "medical_services", key = "#includeDeleted")
    public List<MedicalServiceResponse> getAllServices(boolean includeDeleted) {
        if (includeDeleted) {
            return serviceRepository.findAll().stream()
                    .map(MedicalServiceResponse::fromEntity)
                    .toList();
        }
        return serviceRepository.findAllByDeletedFalse().stream()
                .map(MedicalServiceResponse::fromEntity)
                .toList();
    }

    @Override
    public List<MedicalServiceResponse> getAllServices() {
        return getAllServices(false);
    }

    private Integer validateAndGetHodDepartmentId(com.hospital.api.security.UserPrincipal currentUser) {
        if (currentUser == null) return null;
        boolean isHod = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HEAD_OF_DEPARTMENT"));
        boolean isAdmin = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isHod && !isAdmin) {
            Doctor headDoc = doctorRepository.findByAccount_UserId(currentUser.getId())
                    .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin trưởng khoa", HttpStatus.FORBIDDEN));
            if (headDoc.getDepartment() == null) {
                throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
            }
            return headDoc.getDepartment().getDepartmentId();
        }
        return null;
    }

    @Override
    @Transactional
    public MedicalServiceResponse createMedicalService(MedicalServiceRequest request) {
        return createMedicalService(request, null);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "medical_services", allEntries = true)
    public MedicalServiceResponse createMedicalService(MedicalServiceRequest request, com.hospital.api.security.UserPrincipal currentUser) {
        Integer headDeptId = validateAndGetHodDepartmentId(currentUser);
        if (headDeptId != null && !Objects.equals(headDeptId, request.departmentId())) {
            throw new AppException("Trưởng khoa chỉ có quyền tạo dịch vụ thuộc chuyên khoa mình phụ trách", HttpStatus.FORBIDDEN);
        }

        Department department = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> new AppException("Không tìm thấy chuyên khoa", HttpStatus.NOT_FOUND));

        MedicalService service = MedicalService.builder()
                .serviceName(request.serviceName().trim())
                .price(request.price())
                .description(request.description())
                .department(department)
                .build();
        service.setDeleted(false);

        MedicalService saved = serviceRepository.save(service);
        log.info("Đã tạo mới dịch vụ kỹ thuật y tế: {} (ID: {})", saved.getServiceName(), saved.getServiceId());
        return MedicalServiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public MedicalServiceResponse updateMedicalService(Integer serviceId, MedicalServiceRequest request) {
        return updateMedicalService(serviceId, request, null);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "medical_services", allEntries = true)
    public MedicalServiceResponse updateMedicalService(Integer serviceId, MedicalServiceRequest request, com.hospital.api.security.UserPrincipal currentUser) {
        MedicalService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new AppException("Không tìm thấy dịch vụ y tế với ID: " + serviceId, HttpStatus.NOT_FOUND));

        Integer headDeptId = validateAndGetHodDepartmentId(currentUser);
        if (headDeptId != null) {
            if (service.getDepartment() == null || !Objects.equals(service.getDepartment().getDepartmentId(), headDeptId)) {
                throw new AppException("Trưởng khoa chỉ có quyền chỉnh sửa dịch vụ thuộc khoa mình phụ trách", HttpStatus.FORBIDDEN);
            }
            if (!Objects.equals(headDeptId, request.departmentId())) {
                throw new AppException("Không thể chuyển dịch vụ sang chuyên khoa khác", HttpStatus.FORBIDDEN);
            }
        }

        Department department = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> new AppException("Không tìm thấy chuyên khoa", HttpStatus.NOT_FOUND));

        service.setServiceName(request.serviceName().trim());
        service.setPrice(request.price());
        service.setDescription(request.description());
        service.setDepartment(department);

        MedicalService updated = serviceRepository.save(service);
        log.info("Đã cập nhật dịch vụ kỹ thuật y tế: {} (ID: {})", updated.getServiceName(), updated.getServiceId());
        return MedicalServiceResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public MedicalServiceResponse toggleMedicalServiceStatus(Integer serviceId) {
        return toggleMedicalServiceStatus(serviceId, null);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "medical_services", allEntries = true)
    public MedicalServiceResponse toggleMedicalServiceStatus(Integer serviceId, com.hospital.api.security.UserPrincipal currentUser) {
        MedicalService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new AppException("Không tìm thấy dịch vụ y tế với ID: " + serviceId, HttpStatus.NOT_FOUND));

        Integer headDeptId = validateAndGetHodDepartmentId(currentUser);
        if (headDeptId != null && (service.getDepartment() == null || !Objects.equals(service.getDepartment().getDepartmentId(), headDeptId))) {
            throw new AppException("Trưởng khoa chỉ có quyền thay đổi trạng thái dịch vụ thuộc khoa mình phụ trách", HttpStatus.FORBIDDEN);
        }

        boolean newStatus = !service.isDeleted();
        service.setDeleted(newStatus);
        MedicalService updated = serviceRepository.save(service);
        log.info("Đã thay đổi trạng thái dịch vụ y tế ID {}: deleted={}", serviceId, newStatus);
        return MedicalServiceResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteMedicalService(Integer serviceId) {
        deleteMedicalService(serviceId, null);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "medical_services", allEntries = true)
    public void deleteMedicalService(Integer serviceId, com.hospital.api.security.UserPrincipal currentUser) {
        MedicalService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new AppException("Không tìm thấy dịch vụ y tế với ID: " + serviceId, HttpStatus.NOT_FOUND));

        Integer headDeptId = validateAndGetHodDepartmentId(currentUser);
        if (headDeptId != null && (service.getDepartment() == null || !Objects.equals(service.getDepartment().getDepartmentId(), headDeptId))) {
            throw new AppException("Trưởng khoa chỉ có quyền xóa dịch vụ thuộc khoa mình phụ trách", HttpStatus.FORBIDDEN);
        }

        service.setDeleted(true);
        serviceRepository.save(service);
        log.info("Đã ngừng cung cấp dịch vụ y tế ID {}", serviceId);
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "medicines", key = "#includeDeleted")
    public List<MedicineResponse> getAllMedicines(boolean includeDeleted) {
        if (includeDeleted) {
            return medicineRepository.findAll().stream()
                    .map(MedicineResponse::fromEntity)
                    .toList();
        }
        return medicineRepository.findAllByDeletedFalse().stream()
                .map(MedicineResponse::fromEntity)
                .toList();
    }

    @Override
    public List<MedicineResponse> getAllMedicines() {
        return getAllMedicines(false);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "medicines", allEntries = true)
    public MedicineResponse createMedicine(MedicineRequest request) {
        Medicine medicine = Medicine.builder()
                .medicineName(request.medicineName().trim())
                .activeIngredient(request.activeIngredient())
                .unit(request.unit())
                .price(request.price())
                .stockQuantity(request.stockQuantity() != null ? request.stockQuantity() : 0)
                .build();
        medicine.setDeleted(false);

        Medicine saved = medicineRepository.save(medicine);
        log.info("Đã thêm mới thuốc vào danh mục: {} (ID: {})", saved.getMedicineName(), saved.getMedicineId());
        return MedicineResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "medicines", allEntries = true)
    public MedicineResponse updateMedicine(Integer medicineId, MedicineRequest request) {
        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new AppException("Không tìm thấy thuốc với ID: " + medicineId, HttpStatus.NOT_FOUND));

        medicine.setMedicineName(request.medicineName().trim());
        medicine.setActiveIngredient(request.activeIngredient());
        medicine.setUnit(request.unit());
        medicine.setPrice(request.price());
        if (request.stockQuantity() != null) {
            medicine.setStockQuantity(request.stockQuantity());
        }

        Medicine updated = medicineRepository.save(medicine);
        log.info("Đã cập nhật thông tin thuốc: {} (ID: {})", updated.getMedicineName(), updated.getMedicineId());
        return MedicineResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "medicines", allEntries = true)
    public MedicineResponse toggleMedicineStatus(Integer medicineId) {
        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new AppException("Không tìm thấy thuốc với ID: " + medicineId, HttpStatus.NOT_FOUND));

        boolean newStatus = !medicine.isDeleted();
        medicine.setDeleted(newStatus);
        Medicine updated = medicineRepository.save(medicine);
        log.info("Đã thay đổi trạng thái thuốc ID {}: deleted={}", medicineId, newStatus);
        return MedicineResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public MedicalRecordResponse recordObservations(UUID recordId, List<ObservationInputRequest> observations) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        for (ObservationInputRequest obsReq : observations) {
            MedicalConcept concept = conceptRepository.findByConceptCode(obsReq.conceptCode().trim().toUpperCase())
                    .orElseThrow(() -> new AppException("Không tìm thấy chỉ số Concept với mã: " + obsReq.conceptCode(), HttpStatus.NOT_FOUND));

            // Tự động phân tích kết quả (NORMAL, HIGH, LOW) theo ngưỡng tham chiếu
            String interpretation = "NORMAL";
            if (concept.getDataType() == ConceptDataType.NUMERIC && obsReq.valueNumeric() != null) {
                if (concept.getMinNormal() != null && obsReq.valueNumeric().compareTo(concept.getMinNormal()) < 0) {
                    interpretation = "LOW";
                } else if (concept.getMaxNormal() != null && obsReq.valueNumeric().compareTo(concept.getMaxNormal()) > 0) {
                    interpretation = "HIGH";
                }
            }

            MedicalObservation obs = observationRepository
                    .findByMedicalRecord_RecordIdAndConcept_ConceptCode(record.getRecordId(), concept.getConceptCode())
                    .orElseGet(() -> {
                        MedicalObservation newO = MedicalObservation.builder()
                                .medicalRecord(record)
                                .concept(concept)
                                .build();
                        record.getMedicalObservations().add(newO);
                        return newO;
                    });
            obs.setValueNumeric(obsReq.valueNumeric());
            obs.setValueText(obsReq.valueText());
            obs.setValueBoolean(obsReq.valueBoolean());
            obs.setInterpretation(interpretation);
            obs.setComments(obsReq.comments());

            observationRepository.save(obs);
        }

        return MedicalRecordResponse.fromEntity(recordRepository.save(record));
    }

    @Override
    @Transactional
    public MedicalRecordResponse recordConditions(UUID recordId, List<ConditionInputRequest> conditions) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        for (ConditionInputRequest condReq : conditions) {
            MedicalCondition cond = MedicalCondition.builder()
                    .medicalRecord(record)
                    .icd10Code(condReq.icd10Code().trim().toUpperCase())
                    .diseaseName(condReq.diseaseName().trim())
                    .conditionType(condReq.conditionType() != null ? condReq.conditionType() : ConditionType.PRIMARY)
                    .clinicalStatus(condReq.clinicalStatus() != null ? condReq.clinicalStatus() : "ACTIVE")
                    .notes(condReq.notes())
                    .build();

            conditionRepository.save(cond);
            record.getMedicalConditions().add(cond);
        }

        return MedicalRecordResponse.fromEntity(recordRepository.save(record));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicalObservationResponse> getPatientObservationTrend(UUID patientProfileId, String conceptCode) {
        return getPatientObservationTrend(patientProfileId, conceptCode, null, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicalObservationResponse> getPatientObservationTrend(UUID patientProfileId, String conceptCode, UUID currentUserId, boolean isStaff) {
        if (!isStaff) {
            PatientProfile profile = patientProfileRepository.findById(patientProfileId)
                    .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân", HttpStatus.NOT_FOUND));
            if (profile.getAccount() == null || !profile.getAccount().getUserId().equals(currentUserId)) {
                throw new AppException("Bạn không có quyền xem chỉ số sức khỏe của tài khoản khác", HttpStatus.FORBIDDEN);
            }
        }
        return observationRepository.findPatientTrendData(patientProfileId, conceptCode.trim().toUpperCase())
                .stream()
                .map(MedicalObservationResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public AddendumResponse createAddendum(UUID recordId, UUID doctorAccountId, CreateAddendumRequest request) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        // Kiểm tra điều kiện khóa sau 24h theo Thông tư 46/2018/TT-BYT
        if (!record.isLockedRecord()) {
            throw new AppException("Hồ sơ bệnh án chưa bị khóa (chưa đủ 24 giờ sau khi hoàn tất ca khám). Vui lòng chỉnh sửa trực tiếp trên bệnh án.", HttpStatus.BAD_REQUEST);
        }

        Doctor doctor = null;
        if (doctorAccountId != null) {
            doctor = doctorRepository.findByAccount_UserId(doctorAccountId).orElse(null);
        }
        if (doctor == null) {
            doctor = record.getDoctor();
        }

        // Snapshot chaining: Lấy nội dung trước đó từ Addendum gần nhất hoặc từ bệnh án gốc
        List<MedicalRecordAddendum> existingAddendums = addendumRepository.findByMedicalRecordRecordIdOrderByCreatedAtAsc(recordId);
        String prevDiag = !existingAddendums.isEmpty() && existingAddendums.get(existingAddendums.size() - 1).getUpdatedDiagnosis() != null
                ? existingAddendums.get(existingAddendums.size() - 1).getUpdatedDiagnosis()
                : record.getFinalDiagnosis();
        String prevPlan = !existingAddendums.isEmpty() && existingAddendums.get(existingAddendums.size() - 1).getUpdatedTreatmentPlan() != null
                ? existingAddendums.get(existingAddendums.size() - 1).getUpdatedTreatmentPlan()
                : record.getTreatmentPlan();

        String newDiag = (request.updatedDiagnosis() != null && !request.updatedDiagnosis().trim().isEmpty())
                ? request.updatedDiagnosis().trim()
                : prevDiag;
        String newPlan = (request.updatedTreatmentPlan() != null && !request.updatedTreatmentPlan().trim().isEmpty())
                ? request.updatedTreatmentPlan().trim()
                : prevPlan;

        MedicalRecordAddendum addendum = MedicalRecordAddendum.builder()
                .medicalRecord(record)
                .doctor(doctor)
                .reason(request.reason().trim())
                .previousDiagnosis(prevDiag)
                .updatedDiagnosis(newDiag)
                .previousTreatmentPlan(prevPlan)
                .updatedTreatmentPlan(newPlan)
                .clinicalNotes(request.clinicalNotes() != null ? request.clinicalNotes().trim() : null)
                .build();

        MedicalRecordAddendum saved = addendumRepository.save(addendum);
        record.getAddendums().add(saved);

        // Cập nhật chẩn đoán/hướng điều trị mới nhất trên hồ sơ để đồng bộ hiển thị
        if (request.updatedDiagnosis() != null && !request.updatedDiagnosis().trim().isEmpty()) {
            record.setFinalDiagnosis(newDiag);
        }
        if (request.updatedTreatmentPlan() != null && !request.updatedTreatmentPlan().trim().isEmpty()) {
            record.setTreatmentPlan(newPlan);
        }
        recordRepository.save(record);

        auditLogService.log(
                doctorAccountId,
                doctor != null && doctor.getAccount() != null ? doctor.getAccount().getFullName() : "Bác sĩ",
                "ROLE_DOCTOR",
                "CREATE_ADDENDUM",
                "MEDICAL_RECORD_ADDENDUM",
                saved.getAddendumId().toString(),
                "Tạo phụ lục bệnh án sau 24h: Lý do [" + saved.getReason() + "] cho hồ sơ " + record.getRecordId(),
                null
        );

        return AddendumResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AddendumResponse> getAddendums(UUID recordId) {
        return getAddendums(recordId, null, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AddendumResponse> getAddendums(UUID recordId, UUID currentUserId, boolean isStaff) {
        if (!isStaff) {
            MedicalExaminationRecord record = recordRepository.findById(recordId)
                    .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));
            if (record.getPatientProfile() == null
                    || record.getPatientProfile().getAccount() == null
                    || !record.getPatientProfile().getAccount().getUserId().equals(currentUserId)) {
                throw new AppException("Bạn không có quyền truy cập phụ lục bệnh án này", HttpStatus.FORBIDDEN);
            }
        }
        return addendumRepository.findByMedicalRecordRecordIdOrderByCreatedAtAsc(recordId)
                .stream()
                .map(AddendumResponse::fromEntity)
                .toList();
    }
}


