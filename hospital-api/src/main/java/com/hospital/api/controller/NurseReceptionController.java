package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.NurseCheckInRequest;
import com.hospital.api.dto.request.PayAtClinicRequest;
import com.hospital.api.dto.response.ClinicReceiptResponse;
import com.hospital.api.dto.response.DoctorQueueResponse;
import com.hospital.api.dto.response.NurseCheckInResponse;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.NurseReceptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/nurse")
@RequiredArgsConstructor
public class NurseReceptionController {

    private final NurseReceptionService nurseReceptionService;

    /**
     * Check-in tiếp đón bằng mã QR trong 5 giây cho Lễ tân / Điều dưỡng tiếp đón hợp nhất
     */
    @PostMapping({"/check-in/qr", "/check-in"})
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<NurseCheckInResponse>> checkInByQr(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody NurseCheckInRequest request
    ) {
        NurseCheckInResponse response = nurseReceptionService.checkInByQr(request, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, response.message()));
    }

    /**
     * Tra cứu hàng đợi tiếp nhận sảnh chờ
     */
    @GetMapping({"/reception/queue", "/queue"})
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<DoctorQueueResponse>>> getReceptionQueue(
            @RequestParam(required = false) Integer departmentId
    ) {
        List<DoctorQueueResponse> queue = nurseReceptionService.getReceptionQueue(departmentId);
        return ResponseEntity.ok(ApiResponse.ok(queue, "Lấy danh sách tiếp đón thành công"));
    }

    /**
     * Thu viện phí tại quầy tiếp đón (PAY_AT_CLINIC) và xuất hóa đơn A5
     */
    @PostMapping({"/reception/pay-at-clinic", "/pay-at-clinic"})
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN', 'CASHIER')")
    public ResponseEntity<ApiResponse<ClinicReceiptResponse>> payAtClinic(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody PayAtClinicRequest request
    ) {
        ClinicReceiptResponse response = nurseReceptionService.payAtClinic(request, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, response.message()));
    }
}
