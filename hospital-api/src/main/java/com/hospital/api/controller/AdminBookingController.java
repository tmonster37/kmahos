package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.AdminBookingRescheduleRequest;
import com.hospital.api.dto.response.AdminBookingResponse;
import com.hospital.api.dto.response.AdminBookingSlotResponse;
import com.hospital.api.service.BookingService;
import com.hospital.api.service.AuditLogService;
import com.hospital.api.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/bookings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminBookingController {

    private final BookingService bookingService;
    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminBookingResponse>>> getBookings(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getAdminBookings(fromDate, toDate), "Lấy danh sách lịch hẹn thành công"));
    }

    @GetMapping("/slots")
    public ResponseEntity<ApiResponse<List<AdminBookingSlotResponse>>> getAvailableSlots(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam Integer departmentId) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getAdminBookingSlots(date, departmentId), "Lấy khung giờ còn chỗ thành công"));
    }

    @PutMapping("/{bookingId}/reschedule")
    public ResponseEntity<ApiResponse<AdminBookingResponse>> reschedule(
            @PathVariable UUID bookingId,
            @Valid @RequestBody AdminBookingRescheduleRequest request,
            @AuthenticationPrincipal UserPrincipal actor,
            HttpServletRequest servletRequest) {
        AdminBookingResponse response = bookingService.rescheduleBooking(bookingId, request);
        auditLogService.log(actor.getId(), actor.getPhoneNumber(), "ROLE_ADMIN", "BOOKING_RESCHEDULE",
                "BOOKING", bookingId.toString(), "Rescheduled booking to slot " + request.timeSlotId(), servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok(response, "Đổi lịch hẹn thành công"));
    }

    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal UserPrincipal actor,
            HttpServletRequest servletRequest) {
        bookingService.adminCancelBooking(bookingId);
        auditLogService.log(actor.getId(), actor.getPhoneNumber(), "ROLE_ADMIN", "BOOKING_CANCEL",
                "BOOKING", bookingId.toString(), "Cancelled booking", servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.ok(null, "Hủy lịch hẹn thành công"));
    }
}
