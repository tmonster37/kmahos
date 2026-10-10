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
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/patient-profiles")
@RequiredArgsConstructor
public class PatientProfileController {

    private final PatientProfileService profileService;

    // Tra cứu nhanh hồ sơ bệnh nhân cũ theo SĐT hoặc CCCD (Kèm lịch sử khám gần nhất)
    @GetMapping("/lookup")
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
}
