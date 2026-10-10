package com.hospital.api.service.impl;

import com.hospital.api.constant.*;
import com.hospital.api.dto.request.LisAutomatedResultRequest;
import com.hospital.api.dto.request.PacsCallbackRequest;
import com.hospital.api.dto.response.DicomWorklistItemResponse;
import com.hospital.api.dto.response.LabTestDetailResponse;
import com.hospital.api.dto.response.MedicalTestResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.ClinicalGatewayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClinicalGatewayServiceImpl implements ClinicalGatewayService {

    private final MedicalTestRepository testRepository;
    private final MedicalExaminationRecordRepository recordRepository;
    private final MedicalConceptRepository conceptRepository;
    private final MedicalObservationRepository observationRepository;
    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository;

    private static final String DEFAULT_PACS_VIEWER_BASE_URL = "https://pacs.duckhospital.vn/viewer";

    // 1. DICOM Modality Worklist (MWL) cho máy X-Quang, CT, MRI (Chuẩn Bahmni / dcm4chee)
    @Override
    @Transactional
    public List<DicomWorklistItemResponse> getDicomWorklist(String modalityFilter, LocalDate date) {
        List<MedicalTest> tests = testRepository.findAllByDeletedFalseOrderByCreatedAtDesc();
        List<DicomWorklistItemResponse> worklist = new ArrayList<>();

        for (MedicalTest test : tests) {
            // Lọc các ca chờ chụp hoặc đang thực hiện (chưa hoàn thành)
            if (test.getState() == MedicalTestState.COMPLETED || test.getState() == MedicalTestState.CANCELLED) {
                continue;
            }

            String serviceName = test.getMedicalService() != null ? test.getMedicalService().getServiceName() : "";
            String modality = resolveModality(test.getModality(), serviceName);
            if (modality == null) {
                // Không phải dịch vụ Chẩn đoán hình ảnh
                continue;
            }

            if (modalityFilter != null && !modalityFilter.isBlank() && !modality.equalsIgnoreCase(modalityFilter.trim())) {
                continue;
            }

            // Tự động sinh Accession Number nếu chưa có
            if (test.getAccessionNumber() == null) {
                String accNum = "ACC-" + LocalDate.now().toString().replace("-", "") + "-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
                test.setAccessionNumber(accNum);
                test.setModality(modality);
                testRepository.save(test);
            }

            var record = test.getMedicalRecord();
            var patient = record != null ? record.getPatientProfile() : null;
            var doctor = record != null && record.getDoctor() != null && record.getDoctor().getAccount() != null
                    ? record.getDoctor().getAccount().getFullName() : "Bác sĩ lâm sàng";

            String birthDateStr = patient != null && patient.getDateOfBirth() != null
                    ? patient.getDateOfBirth().toString().replace("-", "") : "19900101";

            String sex = patient != null && patient.getGender() != null
                    ? (patient.getGender() == Gender.MALE ? "M" : "F") : "O";

            worklist.add(new DicomWorklistItemResponse(
                    test.getAccessionNumber(),
                    patient != null && patient.getPatientProfileId() != null ? patient.getPatientProfileId().toString() : "PATIENT-001",
                    patient != null ? patient.getFullName() : "N/A",
                    birthDateStr,
                    sex,
                    modality,
                    serviceName,
                    doctor,
                    "PHONG-CDHA-01",
                    test.getMedicalTestId(),
                    test.getCreatedAt()
            ));
        }

        return worklist;
    }

    private String resolveModality(String currentModality, String serviceName) {
        if (currentModality != null && !currentModality.isBlank()) return currentModality;
        String lower = serviceName.toLowerCase();
        if (lower.contains("x-quang") || lower.contains("xquang") || lower.contains("x quang")) return "CR";
        if (lower.contains("cắt lớp") || lower.contains("ct scanner") || lower.contains("ct")) return "CT";
        if (lower.contains("cộng hưởng từ") || lower.contains("mri")) return "MR";
        if (lower.contains("siêu âm") || lower.contains("ultrasound")) return "US";
        if (lower.contains("nội soi") || lower.contains("endoscopy")) return "ES";
        return null;
    }

    // 2. Tiếp nhận Webhook từ PACS Server & Tích hợp OHIF Web Viewer
    @Override
    @Transactional
    public MedicalTestResponse processPacsCallback(PacsCallbackRequest request) {
        MedicalTest test = testRepository.findByAccessionNumber(request.accessionNumber().trim())
                .orElseThrow(() -> new AppException("Không tìm thấy ca chụp với Accession Number: " + request.accessionNumber(), HttpStatus.NOT_FOUND));

        test.setStudyInstanceUid(request.studyInstanceUid().trim());
        if (request.modality() != null) {
            test.setModality(request.modality().trim().toUpperCase());
        }

        String baseUrl = request.pacsViewerBaseUrl() != null && !request.pacsViewerBaseUrl().isBlank()
                ? request.pacsViewerBaseUrl().trim() : DEFAULT_PACS_VIEWER_BASE_URL;

        // Sinh link xem ảnh DICOM trực tuyến chuẩn OHIF Viewer
        String viewerUrl = baseUrl + "?studyUID=" + request.studyInstanceUid().trim();
        test.setPacsViewerUrl(viewerUrl);
        test.setResultFileUrl(viewerUrl);

        if (request.radiologyNotes() != null && !request.radiologyNotes().isBlank()) {
            test.setTestResult(request.radiologyNotes());
        } else if (test.getTestResult() == null) {
            test.setTestResult("Đã hoàn tất chụp CĐHA (" + (request.numberOfInstances() != null ? request.numberOfInstances() : 1) + " ảnh DICOM). Bác sĩ có thể bấm liên kết để xem phim trực tiếp.");
        }

        test.setState(MedicalTestState.COMPLETED);
        test.setCompletedAt(LocalDateTime.now());
        MedicalTest saved = testRepository.save(test);

        // Kiểm tra xem tất cả các xét nghiệm của record này đã xong chưa
        MedicalExaminationRecord record = test.getMedicalRecord();
        boolean allDone = record.getMedicalTests().stream().allMatch(t -> t.getState() == MedicalTestState.COMPLETED);
        if (allDone) {
            record.setState(MedicalExamState.DIAGNOSING);
            recordRepository.save(record);
        }

        sendNotificationToPatient(
                record.getBooking(),
                "🩻 Đã có hình ảnh Chẩn đoán hình ảnh (PACS)",
                "Kết quả ca chụp [" + test.getMedicalService().getServiceName() + "] đã được tải lên hệ thống PACS. Bác sĩ đã có thể xem phim.",
                "PACS_STUDY_READY"
        );

        log.info("PACS Callback processed successfully: Accession={}, StudyUID={}, ViewerURL={}", request.accessionNumber(), request.studyInstanceUid(), viewerUrl);
        return MedicalTestResponse.fromEntity(saved);
    }

    // 3. Cổng tiếp nhận kết quả tự động từ máy xét nghiệm (LIS Gateway / OpenELIS)
    @Override
    @Transactional
    public LabTestDetailResponse ingestLisResults(LisAutomatedResultRequest request) {
        MedicalTest test = null;

        if (request.specimenBarcode() != null && !request.specimenBarcode().isBlank()) {
            test = testRepository.findBySpecimenBarcode(request.specimenBarcode().trim()).orElse(null);
        }

        if (test == null && request.testCode() != null && !request.testCode().isBlank()) {
            test = testRepository.findByTestCode(request.testCode().trim()).orElse(null);
        }

        if (test == null) {
            throw new AppException("Không tìm thấy ca xét nghiệm phù hợp với Barcode [" + request.specimenBarcode() + "] hoặc TestCode [" + request.testCode() + "]", HttpStatus.NOT_FOUND);
        }

        test.setCompletedAt(LocalDateTime.now());
        test.setState(MedicalTestState.COMPLETED);
        if (request.technicianNotes() != null) {
            test.setTestResult("Kết quả máy tự động (" + (request.machineIdentifier() != null ? request.machineIdentifier() : "LIS") + "): " + request.technicianNotes());
        }

        test.getResultItems().clear();

        for (var itemDto : request.items()) {
            TestResultFlag flag = resolveFlag(itemDto.machineFlag(), itemDto.valueNumeric(), itemDto.referenceRange());

            MedicalTestResultItem item = MedicalTestResultItem.builder()
                    .medicalTest(test)
                    .parameterCode(itemDto.parameterCode().trim().toUpperCase())
                    .parameterName(itemDto.parameterName().trim())
                    .valueNumeric(itemDto.valueNumeric())
                    .valueText(itemDto.valueText())
                    .unit(itemDto.unit())
                    .referenceRange(itemDto.referenceRange())
                    .flag(flag)
                    .notes("Máy " + (request.machineIdentifier() != null ? request.machineIdentifier() : "LIS") + " phân tích")
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

                TestResultFlag flag = resolveFlag(itemDto.machineFlag(), itemDto.valueNumeric(), itemDto.referenceRange());

                MedicalObservation obs = MedicalObservation.builder()
                        .medicalRecord(record)
                        .concept(concept)
                        .valueNumeric(itemDto.valueNumeric())
                        .valueText(itemDto.valueText())
                        .interpretation(flag.name())
                        .recordedAt(LocalDateTime.now())
                        .comments("Tự động từ máy LIS Gateway (" + (request.machineIdentifier() != null ? request.machineIdentifier() : "Analyzer") + ")")
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

        sendNotificationToPatient(
                record.getBooking(),
                "🔬 Kết quả xét nghiệm tự động đã hoàn thành",
                "Máy phân tích [" + (request.machineIdentifier() != null ? request.machineIdentifier() : "LIS") + "] đã hoàn tất " + request.items().size() + " chỉ số xét nghiệm.",
                "LIS_RESULT_AUTO"
        );

        log.info("LIS Automated Results ingested: Barcode={}, TestCode={}, Items={}", request.specimenBarcode(), request.testCode(), request.items().size());
        return LabTestDetailResponse.fromEntity(savedTest);
    }

    private TestResultFlag resolveFlag(String machineFlag, java.math.BigDecimal value, String refRange) {
        if (machineFlag != null && !machineFlag.isBlank()) {
            String mf = machineFlag.trim().toUpperCase();
            if (mf.startsWith("H")) return TestResultFlag.HIGH;
            if (mf.startsWith("L")) return TestResultFlag.LOW;
            if (mf.startsWith("C")) return TestResultFlag.CRITICAL;
            if (mf.startsWith("A")) return TestResultFlag.ABNORMAL;
            if (mf.startsWith("N")) return TestResultFlag.NORMAL;
        }
        return TestResultFlag.NORMAL;
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
}
