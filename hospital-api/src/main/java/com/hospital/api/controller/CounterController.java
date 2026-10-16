package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.CounterActionRequest;
import com.hospital.api.dto.request.KioskDispatchRequest;
import com.hospital.api.dto.response.CounterResponse;
import com.hospital.api.dto.response.CounterTicketResponse;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.CounterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/counters")
@RequiredArgsConstructor
public class CounterController {

    private final CounterService counterService;

    // 1. Lấy danh sách toàn bộ các quầy tiếp đón (công khai cho Kiosk & Màn hình LED TV)
    @GetMapping
    public ResponseEntity<ApiResponse<List<CounterResponse>>> getAllCounters() {
        return ResponseEntity.ok(ApiResponse.ok(counterService.getAllCounters(), "Lấy danh sách quầy tiếp đón thành công"));
    }

    // 2. Cây Kiosk sảnh gửi yêu cầu bốc số thông minh (tự động phân quầy & cân bằng tải)
    @PostMapping("/kiosk/dispatch")
    public ResponseEntity<ApiResponse<CounterTicketResponse>> dispatchFromKiosk(@Valid @RequestBody KioskDispatchRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(counterService.dispatchFromKiosk(request), "Cấp số thứ tự quầy tiếp đón thành công"));
    }

    // 3. Lấy hàng đợi của một quầy cụ thể
    @GetMapping("/{counterId}/queue")
    public ResponseEntity<ApiResponse<List<CounterTicketResponse>>> getQueueForCounter(@PathVariable Integer counterId) {
        return ResponseEntity.ok(ApiResponse.ok(counterService.getQueueForCounter(counterId), "Lấy hàng đợi của quầy thành công"));
    }

    // 4. Điều dưỡng check-in mở quầy làm việc
    @PostMapping("/{counterId}/check-in")
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<CounterResponse>> checkInCounter(
            @PathVariable Integer counterId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                counterService.checkInCounter(counterId, userPrincipal.getId()), "Mở quầy làm việc thành công"
        ));
    }

    // 5. Điều dưỡng đóng quầy làm việc
    @PostMapping("/{counterId}/close")
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<CounterResponse>> closeCounter(
            @PathVariable Integer counterId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                counterService.closeCounter(counterId, userPrincipal.getId()), "Đóng quầy tiếp đón thành công"
        ));
    }

    // 6. Điều dưỡng tạm dừng quầy (nghỉ ca)
    @PostMapping("/{counterId}/pause")
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<CounterResponse>> pauseCounter(
            @PathVariable Integer counterId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                counterService.pauseCounter(counterId, userPrincipal.getId()), "Tạm dừng quầy tiếp đón thành công"
        ));
    }

    // 7. Điều dưỡng bấm gọi số tiếp theo
    @PostMapping("/{counterId}/call-next")
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<CounterTicketResponse>> callNextTicket(
            @PathVariable Integer counterId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                counterService.callNextTicket(counterId, userPrincipal.getId()), "Gọi số tiếp theo thành công"
        ));
    }

    // 8. Điều dưỡng hoàn tất tiếp nhận tại quầy (chuyển sang buồng khám bác sĩ)
    @PostMapping("/{counterId}/tickets/{ticketId}/complete")
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<CounterTicketResponse>> completeTicket(
            @PathVariable Integer counterId,
            @PathVariable Long ticketId,
            @RequestBody(required = false) CounterActionRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                counterService.completeTicket(ticketId, counterId, userPrincipal.getId(), request), "Hoàn tất tiếp đón thành công"
        ));
    }

    // 9. Điều dưỡng bỏ qua lượt vắng mặt
    @PostMapping("/{counterId}/tickets/{ticketId}/skip")
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<ApiResponse<CounterTicketResponse>> skipTicket(
            @PathVariable Integer counterId,
            @PathVariable Long ticketId,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                counterService.skipTicket(ticketId, counterId, userPrincipal.getId()), "Đã bỏ qua phiếu tiếp đón"
        ));
    }
}
