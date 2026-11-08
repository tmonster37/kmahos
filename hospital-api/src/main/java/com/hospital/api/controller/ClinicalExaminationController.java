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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/clinical", "/api/clinical-examinations"})
@RequiredArgsConstructor
public class ClinicalExaminationController {

    private final ClinicalExaminationService clinicalService;
    private final com.hospital.api.service.FhirExportService fhirExportService;
    private final com.hospital.api.repository.DoctorRepository doctorRepository;

    private void validateDoctorRecordAccess(UUID recordId, UserPrincipal userPrincipal) {
        if (userPrincipal == null) return;
        boolean isAdmin = userPrincipal.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"));
        if (isAdmin) return;

        boolean isHod = userPrincipal.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("HEAD_OF_DEPARTMENT"));
        if (isHod) return;

        MedicalRecordResponse record = clinicalService.getRecordById(recordId);
        if (record != null && record.doctorId() != null) {
            doctorRepository.findByAccount_UserId(userPrincipal.getId()).ifPresent(currentDoc -> {
                if (!currentDoc.getDoctorId().equals(record.doctorId())) {
                    boolean sameDept = false;
                    var recordDoc = doctorRepository.findById(record.doctorId()).orElse(null);
                    if (recordDoc != null && recordDoc.getDepartment() != null && currentDoc.getDepartment() != null) {
                        sameDept = currentDoc.getDepartment().getDepartmentId().equals(recordDoc.getDepartment().getDepartmentId());
                    }
                    if (!sameDept) {
                        throw new com.hospital.api.exception.AppException("Bác sĩ không có quyền thao tác trên hồ sơ khám bệnh của bác sĩ khác ngoài chuyên khoa!", org.springframework.http.HttpStatus.FORBIDDEN);
                    }
                }
            });
        }
    }

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

    // 2.1 Bác sĩ gọi số mời bệnh nhân vào buồng khám
    @PostMapping("/call-patient")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<DoctorQueueResponse>> callPatient(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam String bookingCode
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.callPatient(userPrincipal.getId(), bookingCode),
                "Đang gọi bệnh nhân vào buồng khám"
        ));
    }

    // 2.2 Bác sĩ báo vắng mặt / bỏ qua lượt tạm thời
    @PostMapping("/skip-patient")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<DoctorQueueResponse>> skipPatient(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam String bookingCode
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.skipPatient(userPrincipal.getId(), bookingCode),
                "Đã đánh dấu bệnh nhân vắng mặt / bỏ qua lượt"
        ));
    }

    // 2.3 Bác sĩ khôi phục gọi lại bệnh nhân vắng mặt
    @PostMapping("/recall-patient")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<DoctorQueueResponse>> recallPatient(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam String bookingCode
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.recallPatient(userPrincipal.getId(), bookingCode),
                "Đã khôi phục bệnh nhân vào hàng đợi khám"
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
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody AssignMedicalTestRequest request
    ) {
        validateDoctorRecordAccess(recordId, userPrincipal);
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

    // 6.1. Hủy chỉ định xét nghiệm (tránh kẹt ca khám lâm sàng)
    @PostMapping("/tests/{testId}/cancel")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN', 'LAB_TECHNICIAN')")
    public ResponseEntity<ApiResponse<MedicalTestResponse>> cancelMedicalTest(
            @PathVariable UUID testId,
            @RequestParam(required = false) String reason,
            @RequestBody(required = false) CancelMedicalTestRequest body
    ) {
        String effectiveReason = (body != null && body.cancelReason() != null && !body.cancelReason().isBlank())
                ? body.cancelReason() : reason;
        if (effectiveReason == null || effectiveReason.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Vui lòng cung cấp lý do hủy xét nghiệm");
        }
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.cancelMedicalTest(testId, effectiveReason), "Đã hủy chỉ định xét nghiệm thành công"));
    }

    // 7. Bác sĩ kết luận chẩn đoán sau khi có KQ xét nghiệm
    @PutMapping("/records/{recordId}/diagnosis")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> makeDiagnosis(
            @PathVariable UUID recordId,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody DiagnosisRequest request
    ) {
        validateDoctorRecordAccess(recordId, userPrincipal);
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.makeDiagnosis(recordId, request), "Ghi nhận chẩn đoán thành công"));
    }

    // 7.1. Bác sĩ hoàn tất ca khám (cho trường hợp không kê đơn, tư vấn/hướng dẫn hoặc đã có chẩn đoán)
    @PostMapping({"/records/{recordId}/complete", "/records/{recordId}/finish"})
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> completeExamination(
            @PathVariable UUID recordId,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody(required = false) com.hospital.api.dto.request.CompleteExaminationRequest request
    ) {
        validateDoctorRecordAccess(recordId, userPrincipal);
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.completeExamination(recordId, request), "Hoàn tất ca khám bệnh thành công"));
    }

    // 7.2. Bác sĩ đóng ca khám vắng mặt khi bệnh nhân không quay lại sau khi làm CLS
    @PostMapping("/records/{recordId}/abandon-after-tests")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> abandonExaminationAfterTests(
            @PathVariable UUID recordId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        validateDoctorRecordAccess(recordId, userPrincipal);
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.abandonExaminationAfterTests(recordId, reason, userPrincipal),
                "Đã ghi nhận đóng ca khám vắng mặt thành công"
        ));
    }

    // 8. Bác sĩ kê đơn thuốc (Tự động trừ kho thuốc & hoàn tất buổi khám)
    @PostMapping({"/records/{recordId}/prescriptions", "/records/{recordId}/prescription"})
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> createPrescription(
            @PathVariable UUID recordId,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody CreatePrescriptionRequest request
    ) {
        validateDoctorRecordAccess(recordId, userPrincipal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(clinicalService.createPrescription(recordId, request), "Kê toa thuốc thành công"));
    }

    // 8.1. Kiểm tra an toàn dược lý & dị ứng chéo (Clinical Decision Support - CDS)
    @PostMapping({"/records/{recordId}/prescriptions/check-safety", "/records/{recordId}/prescription/check-safety"})
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<DrugSafetyCheckResponse>> checkPrescriptionSafety(
            @PathVariable UUID recordId,
            @Valid @RequestBody CheckPrescriptionSafetyRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.checkPrescriptionSafety(recordId, request),
                "Kiểm tra an toàn đơn thuốc lâm sàng thành công"
        ));
    }

    private boolean checkIsStaff(UserPrincipal userPrincipal) {
        return userPrincipal != null && userPrincipal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("ADMIN") ||
                               a.getAuthority().contains("DOCTOR") ||
                               a.getAuthority().contains("HEAD_OF_DEPARTMENT") ||
                               a.getAuthority().contains("NURSE") ||
                               a.getAuthority().contains("CASHIER") ||
                               a.getAuthority().contains("PHARMACIST") ||
                               a.getAuthority().contains("LAB_TECHNICIAN") ||
                               a.getAuthority().contains("STAFF"));
    }

    // 9. Tra cứu chi tiết hồ sơ bệnh án (Bảo vệ chống IDOR)
    @GetMapping("/records/{recordId}")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> getRecordById(
            @PathVariable UUID recordId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        boolean isStaff = checkIsStaff(userPrincipal);
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.getRecordById(recordId, currentUserId, isStaff),
                "Lấy thông tin hồ sơ khám bệnh thành công"
        ));
    }

    // 9.1. Tra cứu hồ sơ bệnh án điện tử theo mã lịch hẹn / mã khám
    @GetMapping("/records/by-booking/{bookingCode}")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> getRecordByBookingCode(
            @PathVariable String bookingCode,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        boolean isStaff = checkIsStaff(userPrincipal);
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.getRecordByBookingCode(bookingCode, currentUserId, isStaff),
                "Lấy thông tin hồ sơ bệnh án theo mã khám thành công"
        ));
    }

    // 9.2. Tra cứu toàn bộ bệnh án điện tử của một hồ sơ bệnh nhân
    @GetMapping("/patients/{patientProfileId}/records")
    public ResponseEntity<ApiResponse<List<MedicalRecordResponse>>> getRecordsByPatientProfile(
            @PathVariable UUID patientProfileId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        boolean isStaff = checkIsStaff(userPrincipal);
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.getRecordsByPatientProfile(patientProfileId, currentUserId, isStaff),
                "Lấy danh sách bệnh án điện tử theo hồ sơ bệnh nhân thành công"
        ));
    }

    // 10. Lấy danh mục dịch vụ cận lâm sàng cho bác sĩ chọn hoặc quản lý
    @GetMapping("/services")
    public ResponseEntity<ApiResponse<List<MedicalServiceResponse>>> getServices(
            @RequestParam(name = "includeDeleted", required = false, defaultValue = "false") boolean includeDeleted
    ) {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.getAllServices(includeDeleted), "Lấy danh mục dịch vụ thành công"));
    }

    // 10a. Thêm mới dịch vụ kỹ thuật y tế (2.2.36)
    @PostMapping("/services")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<MedicalServiceResponse>> createService(
            @Valid @RequestBody MedicalServiceRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                clinicalService.createMedicalService(request, currentUser),
                "Thêm mới dịch vụ y tế thành công"
        ));
    }

    // 10b. Chỉnh sửa thông tin dịch vụ kỹ thuật y tế (2.2.37)
    @PutMapping("/services/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<MedicalServiceResponse>> updateService(
            @PathVariable Integer serviceId,
            @Valid @RequestBody MedicalServiceRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.updateMedicalService(serviceId, request, currentUser),
                "Cập nhật dịch vụ y tế thành công"
        ));
    }

    // 10c. Khóa / Mở khóa dịch vụ kỹ thuật y tế (2.2.38 & 2.2.39)
    @PutMapping("/services/{serviceId}/toggle-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<MedicalServiceResponse>> toggleServiceStatus(
            @PathVariable Integer serviceId,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.toggleMedicalServiceStatus(serviceId, currentUser),
                "Thay đổi trạng thái dịch vụ y tế thành công"
        ));
    }

    // 10d. Ngừng cung cấp dịch vụ y tế (DELETE)
    @DeleteMapping("/services/{serviceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<Void>> deleteService(
            @PathVariable Integer serviceId,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        clinicalService.deleteMedicalService(serviceId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(null, "Ngừng cung cấp dịch vụ y tế thành công"));
    }

    // 11. Lấy danh mục dược phẩm tồn kho cho bác sĩ kê đơn hoặc quản trị kho dược
    @GetMapping("/medicines")
    public ResponseEntity<ApiResponse<List<MedicineResponse>>> getMedicines(
            @RequestParam(name = "includeDeleted", required = false, defaultValue = "false") boolean includeDeleted
    ) {
        return ResponseEntity.ok(ApiResponse.ok(clinicalService.getAllMedicines(includeDeleted), "Lấy danh mục thuốc thành công"));
    }

    // 11a. Thêm mới thuốc vào danh mục kho dược (ADMIN, PHARMACIST)
    @PostMapping("/medicines")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<MedicineResponse>> createMedicine(
            @Valid @RequestBody MedicineRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                clinicalService.createMedicine(request),
                "Thêm mới thuốc thành công"
        ));
    }

    // 11b. Chỉnh sửa thông tin thuốc (ADMIN, PHARMACIST)
    @PutMapping("/medicines/{medicineId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<MedicineResponse>> updateMedicine(
            @PathVariable Integer medicineId,
            @Valid @RequestBody MedicineRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.updateMedicine(medicineId, request),
                "Cập nhật thông tin thuốc thành công"
        ));
    }

    // 11c. Khóa / Mở khóa thuốc (ADMIN, PHARMACIST)
    @PutMapping("/medicines/{medicineId}/toggle-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<MedicineResponse>> toggleMedicineStatus(
            @PathVariable Integer medicineId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.toggleMedicineStatus(medicineId),
                "Thay đổi trạng thái thuốc thành công"
        ));
    }

    // 11d. Khóa thuốc (DELETE - ADMIN, PHARMACIST)
    @DeleteMapping("/medicines/{medicineId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<ApiResponse<Void>> deleteMedicine(
            @PathVariable Integer medicineId
    ) {
        clinicalService.toggleMedicineStatus(medicineId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Thay đổi trạng thái thuốc thành công"));
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
            @RequestParam String conceptCode,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        boolean isStaff = checkIsStaff(userPrincipal);
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.getPatientObservationTrend(patientProfileId, conceptCode, currentUserId, isStaff),
                "Lấy dữ liệu chuỗi thời gian chỉ số y tế thành công"
        ));
    }

    // 15. Xuất bệnh án điện tử sang chuẩn quốc tế HL7 FHIR R4 Bundle JSON (HAPI FHIR)
    @GetMapping(value = "/records/{recordId}/fhir", produces = "application/json")
    public ResponseEntity<String> exportRecordToFhir(
            @PathVariable UUID recordId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        boolean isStaff = checkIsStaff(userPrincipal);
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        return ResponseEntity.ok(fhirExportService.exportRecordToFhirJson(recordId, currentUserId, isStaff));
    }

    // 16. Lập Phụ lục Bệnh án điện tử (EMR Addendum) theo Thông tư 46/2018/TT-BYT khi hồ sơ khóa sau 24h
    @PostMapping("/records/{recordId}/addendums")
    @PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<AddendumResponse>> createAddendum(
            @PathVariable UUID recordId,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody CreateAddendumRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                clinicalService.createAddendum(recordId, userPrincipal.getId(), request),
                "Lập phụ lục bệnh án (Addendum) theo Thông tư 46/2018/TT-BYT thành công"
        ));
    }

    // 17. Tra cứu danh sách Phụ lục Bệnh án điện tử theo hồ sơ
    @GetMapping("/records/{recordId}/addendums")
    public ResponseEntity<ApiResponse<List<AddendumResponse>>> getAddendums(
            @PathVariable UUID recordId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        boolean isStaff = checkIsStaff(userPrincipal);
        UUID currentUserId = userPrincipal != null ? userPrincipal.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                clinicalService.getAddendums(recordId, currentUserId, isStaff),
                "Lấy danh sách phụ lục bệnh án thành công"
        ));
    }
}


