package com.hospital.api.service;

import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.dto.request.*;
import com.hospital.api.dto.response.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ClinicalExaminationService {
    MedicalRecordResponse startExamination(UUID doctorAccountId, StartExaminationRequest request);
    List<MedicalTestResponse> assignMedicalTests(UUID recordId, AssignMedicalTestRequest request);
    MedicalTestResponse updateTestResult(UUID testId, UpdateTestResultRequest request);
    MedicalRecordResponse makeDiagnosis(UUID recordId, DiagnosisRequest request);
    PrescriptionResponse createPrescription(UUID recordId, CreatePrescriptionRequest request);
    MedicalRecordResponse getRecordById(UUID recordId);

    // Bảng hàng đợi & khám bệnh
    List<DoctorQueueResponse> getDoctorQueue(UUID doctorAccountId, LocalDate date);
    List<DoctorQueueResponse> getPublicQueue(LocalDate date);

    // Kỹ thuật viên trả kết quả xét nghiệm
    List<LabTestDetailResponse> getLabTests(MedicalTestState state);
    LabTestDetailResponse getLabTestById(UUID testId);
    LabTestDetailResponse collectSpecimen(UUID testId, CollectSpecimenRequest request);
    LabTestDetailResponse saveDetailedTestResult(UUID testId, SaveDetailedTestResultRequest request);

    // Quản lý Chỉ số lâm sàng (EHR Observations - OpenMRS/FHIR)
    MedicalRecordResponse recordObservations(UUID recordId, List<ObservationInputRequest> observations);

    // Quản lý Chẩn đoán cấu trúc ICD-10 (EHR Conditions)
    MedicalRecordResponse recordConditions(UUID recordId, List<ConditionInputRequest> conditions);

    // Phân tích dữ liệu chuỗi thời gian (Biểu đồ tăng trưởng, huyết áp, tim thai...)
    List<MedicalObservationResponse> getPatientObservationTrend(UUID patientProfileId, String conceptCode);

    // Danh mục dịch vụ & Dược phẩm
    List<MedicalServiceResponse> getAllServices();
    List<MedicineResponse> getAllMedicines();
}

