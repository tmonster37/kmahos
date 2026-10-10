package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.dto.request.*;
import com.hospital.api.dto.response.*;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.ClinicalExaminationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clinical")
@RequiredArgsConstructor
public class ClinicalExaminationController {

    private final ClinicalExaminationService clinicalService;
    private final com.hospital.api.service.FhirExportService fhirExportService;

    // 1. Lấy danh sách hàng đợi bệnh nhân khám bệnh của Bác sĩ (theo ngày)
    @GetMapping("/doctor/queue")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<DoctorQueueResponse>>> getDoctorQueue(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.getDoctorQueue(userPrincipal.getId(), date),
                "Lấy danh sách hàng đợi khám bệnh thành công"
        ));
    }

    // 2. Bảng hiển thị số gọi khám công cộng (cho màn hình TV sảnh chờ)
    @GetMapping("/queue/public")
    public ResponseEntity<ApiResponse<List<DoctorQueueResponse>>> getPublicQueue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.getPublicQueue(date),
                "Lấy thông tin bảng gọi số sảnh chờ thành công"
        ));
    }

    // 3. Bác sĩ tiếp nhận bệnh nhân & mở phiếu khám
    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> startExamination(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody StartExaminationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(clinicalService.startExamination(userPrincipal.getId(), request), "Tiếp nhận bệnh nhân thành công"));
    }

    // 4. Bác sĩ chỉ định các xét nghiệm cận lâm sàng
    @PostMapping("/records/{recordId}/tests")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<MedicalTestResponse>>> assignMedicalTests(
            @PathVariable UUID recordId,
            @Valid @RequestBody AssignMedicalTestRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(clinicalService.assignMedicalTests(recordId, request), "Chỉ định xét nghiệm thành công"));
    }

    // 5. Kỹ thuật viên xem danh sách các chỉ định xét nghiệm (có thể lọc theo trạng thái)
    @GetMapping("/lab/tests")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<LabTestDetailResponse>>> getLabTests(
            @RequestParam(required = false) MedicalTestState state
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.getLabTests(state),
                "Lấy danh sách chỉ định xét nghiệm thành công"
        ));
    }

    // 5.1. Xem chi tiết 1 chỉ định xét nghiệm kèm barcode và các chỉ số
    @GetMapping("/tests/{testId}")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<LabTestDetailResponse>> getLabTestById(@PathVariable UUID testId) {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.getLabTestById(testId), "Lấy chi tiết xét nghiệm thành công"));
    }

    // 5.2. Tiếp nhận & Lấy mẫu bệnh phẩm (LIS Specimen Collection)
    @PostMapping("/tests/{testId}/collect-sample")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'NURSE', 'DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<LabTestDetailResponse>> collectSpecimen(
            @PathVariable UUID testId,
            @Valid @RequestBody CollectSpecimenRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.collectSpecimen(testId, request), "Tiếp nhận và lấy mẫu bệnh phẩm thành công"));
    }

    // 5.3. Nhập chi tiết các chỉ số xét nghiệm (LIS Detailed Result Entry) & Tự động đồng bộ EHR
    @PutMapping("/tests/{testId}/detailed-result")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<LabTestDetailResponse>> saveDetailedTestResult(
            @PathVariable UUID testId,
            @Valid @RequestBody SaveDetailedTestResultRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.saveDetailedTestResult(testId, request), "Cập nhật chi tiết kết quả xét nghiệm và đồng bộ EHR thành công"));
    }

    // 6. Kỹ thuật viên phòng Lab trả kết quả xét nghiệm + link ảnh/PDF (đơn giản cũ)
    @PutMapping("/tests/{testId}/result")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalTestResponse>> updateTestResult(
            @PathVariable UUID testId,
            @Valid @RequestBody UpdateTestResultRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.updateTestResult(testId, request), "Cập nhật kết quả xét nghiệm thành công"));
    }

    // 7. Bác sĩ kết luận chẩn đoán sau khi có KQ xét nghiệm
    @PutMapping("/records/{recordId}/diagnosis")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> makeDiagnosis(
            @PathVariable UUID recordId,
            @Valid @RequestBody DiagnosisRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.makeDiagnosis(recordId, request), "Ghi nhận chẩn đoán thành công"));
    }

    // 8. Bác sĩ kê đơn thuốc (Tự động trừ kho thuốc & hoàn tất buổi khám)
    @PostMapping({"/records/{recordId}/prescriptions", "/records/{recordId}/prescription"})
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> createPrescription(
            @PathVariable UUID recordId,
            @Valid @RequestBody CreatePrescriptionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(clinicalService.createPrescription(recordId, request), "Kê toa thuốc thành công"));
    }

    // 9. Tra cứu chi tiết hồ sơ bệnh án
    @GetMapping("/records/{recordId}")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> getRecordById(@PathVariable UUID recordId) {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.getRecordById(recordId), "Lấy thông tin hồ sơ khám bệnh thành công"));
    }

    // 10. Lấy danh mục dịch vụ cận lâm sàng cho bác sĩ chọn
    @GetMapping("/services")
    public ResponseEntity<ApiResponse<List<MedicalServiceResponse>>> getServices() {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.getAllServices(), "Lấy danh mục dịch vụ thành công"));
    }

    // 11. Lấy danh mục dược phẩm tồn kho cho bác sĩ kê đơn
    @GetMapping("/medicines")
    public ResponseEntity<ApiResponse<List<MedicineResponse>>> getMedicines() {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.getAllMedicines(), "Lấy danh mục thuốc thành công"));
    }

    // 12. Bác sĩ lưu các chỉ số lâm sàng động (Observations - Sản, Mắt, RHM, Nhi, Sinh hiệu)
    @PostMapping("/records/{recordId}/observations")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> recordObservations(
            @PathVariable UUID recordId,
            @Valid @RequestBody SaveObservationsRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.recordObservations(recordId, request.observations()),
                "Lưu chỉ số lâm sàng chuyên khoa thành công"
        ));
    }

    // 13. Bác sĩ lưu danh sách chẩn đoán mã ICD-10 (Conditions)
    @PostMapping("/records/{recordId}/conditions")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> recordConditions(
            @PathVariable UUID recordId,
            @Valid @RequestBody SaveConditionsRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.recordConditions(recordId, request.conditions()),
                "Lưu danh sách mã bệnh ICD-10 thành công"
        ));
    }

    // 14. Lấy dữ liệu chuỗi thời gian của bệnh nhân để vẽ biểu đồ theo dõi (VD: huyết áp, cân nặng trẻ, tim thai)
    @GetMapping("/patients/{patientProfileId}/chart-data")
    public ResponseEntity<ApiResponse<List<MedicalObservationResponse>>> getPatientObservationTrend(
            @PathVariable UUID patientProfileId,
            @RequestParam String conceptCode
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.getPatientObservationTrend(patientProfileId, conceptCode),
                "Lấy dữ liệu chuỗi thời gian chỉ số y tế thành công"
        ));
    }

    // 15. Xuất bệnh án điện tử sang chuẩn quốc tế HL7 FHIR R4 Bundle JSON (HAPI FHIR)
    @GetMapping(value = "/records/{recordId}/fhir", produces = "application/json")
    public ResponseEntity<String> exportRecordToFhir(@PathVariable UUID recordId) {
        return ResponseEntity.ok(fhirExportService.exportRecordToFhirJson(recordId));
    }
}


