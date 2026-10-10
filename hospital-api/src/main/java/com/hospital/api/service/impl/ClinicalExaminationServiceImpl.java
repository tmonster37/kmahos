package com.hospital.api.service.impl;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.MedicalExamState;
import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.dto.request.*;
import com.hospital.api.dto.response.*;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.ClinicalExaminationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.hospital.api.constant.ConceptDataType;
import com.hospital.api.constant.ConditionType;
import com.hospital.api.entity.MedicalConcept;
import com.hospital.api.entity.MedicalCondition;
import com.hospital.api.entity.MedicalObservation;
import com.hospital.api.repository.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClinicalExaminationServiceImpl implements ClinicalExaminationService {

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
        Booking booking = bookingRepository.findByBookingCode(request.bookingCode())
                .orElseThrow(() -> new AppException("Không tìm thấy mã đặt khám: " + request.bookingCode(), HttpStatus.NOT_FOUND));

        Doctor doctor = doctorRepository.findByAccount_UserId(doctorAccountId)
                .orElseGet(() -> doctorRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new AppException("Không tìm thấy thông tin Bác sĩ trong hệ thống", HttpStatus.FORBIDDEN)));

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
                .state(MedicalExamState.WAITING)
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

        return MedicalRecordResponse.fromEntity(recordRepository.save(record));
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

        return testRepository.saveAll(tests).stream().map(MedicalTestResponse::fromEntity).toList();
    }

    @Override
    @Transactional
    public MedicalTestResponse updateTestResult(UUID testId, UpdateTestResultRequest request) {
        MedicalTest test = testRepository.findById(testId)
                .orElseThrow(() -> new AppException("Không tìm thấy chỉ định xét nghiệm", HttpStatus.NOT_FOUND));

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

        // Kiểm tra xem tất cả các xét nghiệm của record này đã xong chưa
        MedicalExaminationRecord record = test.getMedicalRecord();
        boolean allDone = record.getMedicalTests().stream().allMatch(t -> t.getState() == MedicalTestState.COMPLETED);
        if (allDone) {
            record.setState(MedicalExamState.DIAGNOSING);
            recordRepository.save(record);
        }

        return MedicalTestResponse.fromEntity(testRepository.save(test));
    }

    @Override
    @Transactional
    public MedicalRecordResponse makeDiagnosis(UUID recordId, DiagnosisRequest request) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        record.setFinalDiagnosis(request.finalDiagnosis());
        record.setTreatmentPlan(request.treatmentPlan());
        record.setReExaminationDate(request.reExaminationDate());

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
        sendNotificationToPatient(
                record.getBooking(),
                "🩺 Đã có kết luận chẩn đoán",
                "Bác sĩ đã kết luận chẩn đoán: " + request.finalDiagnosis() + ". Kế hoạch: " + (request.treatmentPlan() != null ? request.treatmentPlan() : "Xem chi tiết trong bệnh án."),
                "DIAGNOSIS_COMPLETED"
        );

        return MedicalRecordResponse.fromEntity(recordRepository.save(record));
    }

    @Override
    @Transactional
    public PrescriptionResponse createPrescription(UUID recordId, CreatePrescriptionRequest request) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

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

        // Đánh dấu hoàn thành buổi khám
        record.setState(MedicalExamState.DONE);
        record.getBooking().setStatus(BookingStatus.COMPLETED);
        recordRepository.save(record);

        // Gửi thông báo đơn thuốc đến bệnh nhân
        sendNotificationToPatient(
                record.getBooking(),
                "💊 Đã có đơn thuốc khám bệnh",
                "Toa thuốc mã [" + savedPrescription.getPrescriptionCode() + "] đã được kê gồm " + items.size() + " loại thuốc. Tổng tiền: " + savedPrescription.getTotalAmount() + " VNĐ.",
                "PRESCRIPTION_DONE"
        );

        return PrescriptionResponse.fromEntity(savedPrescription);
    }

    @Override
    public MedicalRecordResponse getRecordById(UUID recordId) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));
        return MedicalRecordResponse.fromEntity(record);
    }

    @Override
    public List<DoctorQueueResponse> getDoctorQueue(UUID doctorAccountId, LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        List<Booking> bookings = bookingRepository.findAllByDoctor_Account_UserIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(doctorAccountId, queryDate);
        return bookings.stream().map(b -> {
            var recordOpt = recordRepository.findByBooking_BookingCode(b.getBookingCode());
            return DoctorQueueResponse.fromEntity(b, recordOpt.orElse(null));
        }).toList();
    }

    @Override
    public List<DoctorQueueResponse> getPublicQueue(LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        List<Booking> bookings = bookingRepository.findAllByBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(queryDate);
        return bookings.stream().map(b -> {
            var recordOpt = recordRepository.findByBooking_BookingCode(b.getBookingCode());
            return DoctorQueueResponse.fromEntity(b, recordOpt.orElse(null));
        }).toList();
    }


    @Override
    public List<LabTestDetailResponse> getLabTests(MedicalTestState state) {
        List<MedicalTest> tests;
        if (state != null) {
            tests = testRepository.findAllByStateAndDeletedFalseOrderByCreatedAtDesc(state);
        } else {
            tests = testRepository.findAllByDeletedFalseOrderByCreatedAtDesc();
        }
        return tests.stream().map(LabTestDetailResponse::fromEntity).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LabTestDetailResponse getLabTestById(UUID testId) {
        MedicalTest test = testRepository.findById(testId)
                .orElseThrow(() -> new AppException("Không tìm thấy chỉ định xét nghiệm với ID: " + testId, HttpStatus.NOT_FOUND));
        return LabTestDetailResponse.fromEntity(test);
    }

    @Override
    @Transactional
    public LabTestDetailResponse collectSpecimen(UUID testId, CollectSpecimenRequest request) {
        MedicalTest test = testRepository.findById(testId)
                .orElseThrow(() -> new AppException("Không tìm thấy chỉ định xét nghiệm", HttpStatus.NOT_FOUND));

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

        return LabTestDetailResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public LabTestDetailResponse saveDetailedTestResult(UUID testId, SaveDetailedTestResultRequest request) {
        MedicalTest test = testRepository.findById(testId)
                .orElseThrow(() -> new AppException("Không tìm thấy chỉ định xét nghiệm", HttpStatus.NOT_FOUND));

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
            com.hospital.api.constant.TestResultFlag flag = itemDto.flag() != null ? itemDto.flag() : com.hospital.api.constant.TestResultFlag.NORMAL;

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

        // Kiểm tra xem tất cả các xét nghiệm của record này đã xong chưa
        MedicalExaminationRecord record = test.getMedicalRecord();
        boolean allDone = record.getMedicalTests().stream().allMatch(t -> t.getState() == MedicalTestState.COMPLETED);
        if (allDone) {
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

        return LabTestDetailResponse.fromEntity(savedTest);
    }


    @Override
    @org.springframework.cache.annotation.Cacheable(value = "medical_services")
    public List<MedicalServiceResponse> getAllServices() {
        return serviceRepository.findAllByDeletedFalse().stream()
                .map(MedicalServiceResponse::fromEntity)
                .toList();
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "medicines")
    public List<MedicineResponse> getAllMedicines() {
        return medicineRepository.findAll().stream()
                .map(MedicineResponse::fromEntity)
                .toList();
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

            MedicalObservation obs = MedicalObservation.builder()
                    .medicalRecord(record)
                    .concept(concept)
                    .valueNumeric(obsReq.valueNumeric())
                    .valueText(obsReq.valueText())
                    .valueBoolean(obsReq.valueBoolean())
                    .interpretation(interpretation)
                    .comments(obsReq.comments())
                    .build();

            observationRepository.save(obs);
            record.getMedicalObservations().add(obs);
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
        return observationRepository.findPatientTrendData(patientProfileId, conceptCode.trim().toUpperCase())
                .stream()
                .map(MedicalObservationResponse::fromEntity)
                .toList();
    }
}


