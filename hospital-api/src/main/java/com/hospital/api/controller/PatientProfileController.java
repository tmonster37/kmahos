package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.PatientProfileRequest;
import com.hospital.api.dto.response.PatientProfileResponse;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.PatientProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.hospital.api.dto.response.PatientProfileLookupResponse;
import com.hospital.api.dto.request.FindPatientByCodeRequest;
import com.hospital.api.dto.request.FindPatientByInfoRequest;
import com.hospital.api.dto.request.LinkPatientProfileRequest;
import com.hospital.api.dto.response.PatientLinkSummaryResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/patient-profiles")
@RequiredArgsConstructor
public class PatientProfileController {

    private final PatientProfileService profileService;

    // Tra cứu nhanh hồ sơ bệnh nhân cũ theo SĐT hoặc CCCD (Kèm lịch sử khám gần nhất)
    @GetMapping("/lookup")
    @org.springframework.security.access.prepost.PreAuthorize("permitAll()")
    public ResponseEntity<ApiResponse<List<PatientProfileLookupResponse>>> lookupPatients(
            @RequestParam(value = "keyword", required = false, defaultValue = "") String keyword
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                profileService.lookupPatients(keyword),
                "Tra cứu danh sách hồ sơ bệnh nhân thành công"
        ));
    }

    // Lấy tất cả hồ sơ bệnh nhân của user đang đăng nhập
    @GetMapping
    public ResponseEntity<ApiResponse<List<PatientProfileResponse>>> getMyProfiles(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.getMyProfiles(userPrincipal.getId()), "Lấy danh sách hồ sơ thành công"));
    }

    // Lấy chi tiết hồ sơ bệnh nhân (Bảo vệ chống IDOR)
    @GetMapping("/{profileId}")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> getProfileById(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID profileId
    ) {
        boolean isStaff = userPrincipal != null && userPrincipal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("ADMIN") ||
                               a.getAuthority().contains("DOCTOR") ||
                               a.getAuthority().contains("HEAD_OF_DEPARTMENT") ||
                               a.getAuthority().contains("NURSE") ||
                               a.getAuthority().contains("CASHIER") ||
                               a.getAuthority().contains("PHARMACIST") ||
                               a.getAuthority().contains("LAB_TECHNICIAN") ||
                               a.getAuthority().contains("STAFF"));
        return ResponseEntity.ok(ApiResponse.ok(
                profileService.getProfileById(userPrincipal.getId(), profileId, isStaff),
                "Lấy chi tiết hồ sơ bệnh nhân thành công"
        ));
    }

    // Tạo hồ sơ bệnh nhân mới
    @PostMapping
    public ResponseEntity<ApiResponse<PatientProfileResponse>> createProfile(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody PatientProfileRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(profileService.createProfile(userPrincipal.getId(), request), "Tạo hồ sơ bệnh nhân thành công"));
    }

    // Sửa hồ sơ
    @PutMapping("/{profileId}")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID profileId,
            @Valid @RequestBody PatientProfileRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(profileService.updateProfile(userPrincipal.getId(), profileId, request), "Cập nhật hồ sơ thành công"));
    }

    // Xóa hồ sơ
    @DeleteMapping("/{profileId}")
    public ResponseEntity<ApiResponse<Void>> deleteProfile(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID profileId
    ) {
        profileService.deleteProfile(userPrincipal.getId(), profileId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Xóa hồ sơ thành công"));
    }

    // 1. Tìm hồ sơ bệnh nhân cũ theo mã (Hình 2.16)
    @PostMapping("/link/search-by-code")
    public ResponseEntity<ApiResponse<PatientLinkSummaryResponse>> searchProfileByCode(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody FindPatientByCodeRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                profileService.findProfileByCode(userPrincipal.getId(), request.patientCode()),
                "Tìm thấy thông tin hồ sơ bệnh nhân"
        ));
    }

    // 2. Tìm hồ sơ bệnh nhân cũ khi quên mã (Hình 2.17)
    @PostMapping("/link/search-by-info")
    public ResponseEntity<ApiResponse<List<PatientLinkSummaryResponse>>> searchProfilesByInfo(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody FindPatientByInfoRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                profileService.findProfilesByInfo(userPrincipal.getId(), request),
                "Tra cứu danh sách hồ sơ phù hợp thành công"
        ));
    }

    // 3. Xác thực số điện thoại & liên kết hồ sơ vào tài khoản đang đăng nhập
    @PostMapping("/link/verify-and-link")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> verifyAndLinkProfile(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody LinkPatientProfileRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                profileService.linkExistingProfile(userPrincipal.getId(), request),
                "Liên kết hồ sơ bệnh nhân thành công!"
        ));
    }
}
