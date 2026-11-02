package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.DoctorCreateRequest;
import com.hospital.api.dto.request.DoctorUpdateRequest;
import com.hospital.api.dto.request.UpdateDoctorLicenseRequest;
import com.hospital.api.dto.response.DoctorAdminResponse;
import com.hospital.api.dto.response.DoctorLicenseResponse;
import com.hospital.api.service.DoctorAdminService;
import com.hospital.api.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/admin/doctors", "/api/doctors"})
@RequiredArgsConstructor
public class DoctorAdminController {

    private final DoctorAdminService doctorAdminService;

    // 1. Lấy danh sách Bác sĩ (ADMIN: toàn viện/theo khoa; Trưởng khoa: chỉ bác sĩ thuộc khoa mình)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<List<DoctorAdminResponse>>> getAllDoctors(
            @RequestParam(required = false) Integer departmentId,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        List<DoctorAdminResponse> responses = doctorAdminService.getAllDoctors(departmentId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(responses, "Lấy danh sách bác sĩ thành công"));
    }

    // 2. Thêm mới Bác sĩ (Tạo Account + Doctor)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DoctorAdminResponse>> createDoctor(@Valid @RequestBody DoctorCreateRequest request) {
        DoctorAdminResponse response = doctorAdminService.createDoctor(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Thêm bác sĩ thành công"));
    }

    // 3. Cập nhật thông tin Bác sĩ
    @PutMapping("/{doctorId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DoctorAdminResponse>> updateDoctor(
            @PathVariable UUID doctorId,
            @Valid @RequestBody DoctorUpdateRequest request
    ) {
        DoctorAdminResponse response = doctorAdminService.updateDoctor(doctorId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Cập nhật bác sĩ thành công"));
    }

    // 4. Xóa mềm Bác sĩ
    @DeleteMapping("/{doctorId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteDoctor(@PathVariable UUID doctorId) {
        doctorAdminService.deleteDoctor(doctorId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xóa bác sĩ thành công"));
    }

    // 5. Phân công khoa cho Bác sĩ
    @PatchMapping("/{doctorId}/assign-department")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DoctorAdminResponse>> assignDepartment(
            @PathVariable UUID doctorId,
            @RequestParam Integer departmentId
    ) {
        DoctorAdminResponse response = doctorAdminService.assignDepartment(doctorId, departmentId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Phân công chuyên khoa cho bác sĩ thành công"));
    }

    // 6. Bổ nhiệm / Bãi nhiệm Trưởng khoa
    @PatchMapping("/{doctorId}/set-head-of-department")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DoctorAdminResponse>> setHeadOfDepartment(
            @PathVariable UUID doctorId,
            @RequestParam boolean isHead
    ) {
        DoctorAdminResponse response = doctorAdminService.setHeadOfDepartment(doctorId, isHead);
        return ResponseEntity.ok(ApiResponse.ok(response,
                isHead ? "Bổ nhiệm Trưởng khoa thành công" : "Bãi nhiệm Trưởng khoa thành công"));
    }

    // 7. Cập nhật Chứng chỉ hành nghề (CCHN) cho Bác sĩ
    @PutMapping("/{doctorId}/license")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DoctorLicenseResponse>> updateDoctorLicense(
            @PathVariable UUID doctorId,
            @Valid @RequestBody UpdateDoctorLicenseRequest request
    ) {
        DoctorLicenseResponse response = doctorAdminService.updateDoctorLicense(doctorId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Cập nhật chứng chỉ hành nghề cho bác sĩ thành công"));
    }

    // 8. Tra cứu danh sách chứng chỉ hành nghề của toàn bộ bác sĩ
    @GetMapping("/licenses")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<DoctorLicenseResponse>>> getDoctorLicenses(
            @RequestParam(required = false, defaultValue = "false") boolean onlyUnlicensed
    ) {
        List<DoctorLicenseResponse> responses = doctorAdminService.getDoctorLicenses(onlyUnlicensed);
        return ResponseEntity.ok(ApiResponse.ok(responses, "Lấy danh sách chứng chỉ hành nghề bác sĩ thành công"));
    }
}
