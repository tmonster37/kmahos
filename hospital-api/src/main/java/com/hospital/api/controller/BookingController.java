package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.BookingCreateRequest;
import com.hospital.api.dto.response.BookingResponse;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.BookingService;
import com.hospital.api.service.AuditLogService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final com.hospital.api.service.SlotReservationService slotReservationService;
    private final AuditLogService auditLogService;

    // Giữ chỗ khung giờ tạm thời trong 10 phút (chống đặt trùng đồng thời)
    @PostMapping("/reserve-slot")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.ReserveSlotResponse>> reserveSlot(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody com.hospital.api.dto.request.ReserveSlotRequest request
    ) {
        UUID accountId = userPrincipal != null ? userPrincipal.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(slotReservationService.reserveSlot(request, accountId), "Giữ chỗ khung giờ thành công"));
    }

    // Tự động hoặc chủ động giải phóng slot giữ chỗ khi bệnh nhân đổi ý
    @PostMapping("/release-slot/{reservationId}")
    public ResponseEntity<ApiResponse<Void>> releaseSlot(@PathVariable UUID reservationId) {
        slotReservationService.releaseSlot(reservationId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã giải phóng slot giữ chỗ thành công"));
    }

    // Bệnh nhân thực hiện đặt lịch khám
    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody BookingCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(bookingService.createBooking(userPrincipal.getId(), request), "Đặt lịch khám thành công"));
    }

    // Xem lịch sử các lượt đặt khám của tôi
    @GetMapping({"/my-history", "/my-bookings"})
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getMyBookings(userPrincipal.getId()), "Lấy lịch sử đặt khám thành công"));
    }

    // Tra cứu phiếu đặt khám bằng mã (Mã QR hoặc Barcode)
    @GetMapping("/code/{bookingCode}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingByCode(@PathVariable String bookingCode) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getBookingByCode(bookingCode), "Lấy thông tin phiếu khám thành công"));
    }

    // Bệnh nhân bấm lấy số tự động tại cây Kiosk sảnh bệnh viện
    @PostMapping("/kiosk")
    public ResponseEntity<ApiResponse<BookingResponse>> createKioskBooking(@Valid @RequestBody com.hospital.api.dto.request.KioskBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(bookingService.createKioskBooking(request), "Cấp số khám Kiosk thành công"));
    }

    // Bệnh nhân đã đặt trước thực hiện Check-in tại cây Kiosk (có bảo vệ khung giờ tiếp nhận)
    @PostMapping("/kiosk/check-in")
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.KioskCheckInResponse>> checkInKiosk(@Valid @RequestBody com.hospital.api.dto.request.KioskCheckInRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.checkInKiosk(request), "Check-in Kiosk thành công"));
    }

    // Bệnh nhân hủy lịch khám đã đặt
    @PutMapping("/{bookingId}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> cancelBooking(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID bookingId,
            HttpServletRequest servletRequest
    ) {
        bookingService.adminCancelBooking(bookingId);
        auditLogService.log(userPrincipal.getId(), userPrincipal.getPhoneNumber(), "ROLE_ADMIN", "BOOKING_CANCEL",
                "BOOKING", bookingId.toString(), "Cancelled booking", servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã hủy lịch khám thành công"));
    }
}

