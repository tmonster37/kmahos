package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.NurseCheckInRequest;
import com.hospital.api.dto.request.NurseWalkInReceptionRequest;
import com.hospital.api.dto.request.PayAtClinicRequest;
import com.hospital.api.dto.response.ClinicReceiptResponse;
import com.hospital.api.dto.response.NurseQueueResponse;
import com.hospital.api.dto.response.NurseCheckInResponse;
import com.hospital.api.repository.BookingRepository;
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
    private final BookingRepository bookingRepository;

    /**
     * Tiếp nhận bệnh nhân vãng lai tại quầy (lưu DB thực, cấp số hàng đợi và cập nhật hồ sơ bệnh nhân)
     */
    @PostMapping({"/reception/walk-in", "/walk-in"})
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<NurseQueueResponse>> admitWalkIn(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody NurseWalkInReceptionRequest request
    ) {
        NurseQueueResponse response = nurseReceptionService.admitWalkInPatient(request, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, "Tiếp nhận bệnh nhân vãng lai thành công"));
    }

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
    public ResponseEntity<ApiResponse<List<NurseQueueResponse>>> getReceptionQueue(
            @RequestParam(required = false) Integer departmentId
    ) {
        List<NurseQueueResponse> queue = nurseReceptionService.getReceptionQueue(departmentId);
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

    /**
     * Cập nhật trạng thái lượt khám (CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED)
     */
    @PutMapping({"/reception/bookings/{id}/status", "/bookings/{id}/status"})
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.BookingResponse>> updateBookingStatus(
            @PathVariable java.util.UUID id,
            @RequestParam com.hospital.api.constant.BookingStatus status
    ) {
        com.hospital.api.dto.response.BookingResponse response = nurseReceptionService.updateBookingStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok(response, "Cập nhật trạng thái lượt khám thành công"));
    }

    /**
     * Điều phối bệnh nhân vào buồng khám của bác sĩ (Smart Dispatch to Doctor/Room Queue)
     */
    @PostMapping({"/reception/bookings/{id}/dispatch", "/bookings/{id}/dispatch"})
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<NurseQueueResponse>> dispatchBooking(
            @PathVariable java.util.UUID id,
            @RequestParam(required = false) Integer roomId,
            @RequestParam(required = false) String roomName,
            @RequestParam(required = false) java.util.UUID doctorId
    ) {
        NurseQueueResponse response = nurseReceptionService.dispatchBooking(id, roomId, roomName, doctorId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Điều phối bệnh nhân vào buồng khám thành công"));
    }

    /**
     * Điều phối bệnh nhân dạng Body JSON cho Client frontend
     */
    @PostMapping({"/reception/dispatch", "/dispatch"})
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<NurseQueueResponse>> dispatchBookingByBody(
            @RequestBody java.util.Map<String, Object> body
    ) {
        java.util.UUID bookingId = null;
        if (body.get("bookingId") != null) {
            String bIdStr = String.valueOf(body.get("bookingId")).replace("BK-", "");
            try {
                bookingId = java.util.UUID.fromString(bIdStr);
            } catch (Exception ignored) {}
        }
        Integer targetRoomId = null;
        if (body.get("targetRoomId") != null) {
            try {
                targetRoomId = Integer.valueOf(String.valueOf(body.get("targetRoomId")));
            } catch (Exception ignored) {}
        } else if (body.get("roomId") != null) {
            try {
                targetRoomId = Integer.valueOf(String.valueOf(body.get("roomId")));
            } catch (Exception ignored) {}
        }
        if (bookingId == null) {
            String candidateCode = body.get("bookingCode") != null ? String.valueOf(body.get("bookingCode")).trim()
                    : (body.get("bookingId") != null ? String.valueOf(body.get("bookingId")).trim() : null);
            if (candidateCode != null && !candidateCode.isBlank()) {
                var found = bookingRepository.findByBookingCode(candidateCode);
                if (found.isPresent()) {
                    bookingId = found.get().getBookingId();
                }
            }
        }
        if (bookingId == null) {
            throw new com.hospital.api.exception.AppException("Mã lượt khám không hợp lệ", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        NurseQueueResponse response = nurseReceptionService.dispatchBooking(bookingId, targetRoomId, null, null);
        return ResponseEntity.ok(ApiResponse.ok(response, "Điều phối bệnh nhân vào buồng khám thành công"));
    }
}
