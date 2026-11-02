package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.CreateRatingRequest;
import com.hospital.api.dto.request.CreateReminderRequest;
import com.hospital.api.dto.response.DashboardStatisticsResponse;
import com.hospital.api.entity.MedicineReminder;
import com.hospital.api.entity.Notification;
import com.hospital.api.repository.NotificationRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.NotificationService;
import com.hospital.api.service.impl.DashboardServiceImpl;
import com.hospital.api.service.impl.MedicineReminderServiceImpl;
import com.hospital.api.service.impl.RatingServiceImpl;
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
@RequestMapping("/api/utilities")
@RequiredArgsConstructor
public class UtilityController {

    private final MedicineReminderServiceImpl reminderService;
    private final RatingServiceImpl ratingService;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final DashboardServiceImpl dashboardService;

    // Gửi thông báo đến bệnh nhân (qua bookingCode hoặc phoneNumber)
    @PostMapping("/notifications/send")
    public ResponseEntity<ApiResponse<Notification>> sendNotification(
            @Valid @RequestBody com.hospital.api.dto.request.SendNotificationRequest request
    ) {
        Notification notification = notificationService.sendNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(notification, "Gửi thông báo đến bệnh nhân thành công"));
    }

    // Gửi thông báo đợt khám / hàng đợi theo nhóm
    @PostMapping("/notifications/queue-alerts")
    public ResponseEntity<ApiResponse<List<Notification>>> sendQueueAlerts(
            @Valid @RequestBody com.hospital.api.dto.request.QueueAlertBatchRequest request
    ) {
        List<Notification> list = notificationService.sendQueueAlerts(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(list, "Gửi thông báo hàng đợi thành công"));
    }

    // 1. Xem lịch nhắc uống thuốc
    @GetMapping("/reminders")
    public ResponseEntity<ApiResponse<List<MedicineReminder>>> getMyReminders(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.ok(reminderService.getMyReminders(user.getId()), "Lấy lịch nhắc thuốc thành công"));
    }

    // 2. Tạo lịch nhắc thuốc mới
    @PostMapping("/reminders")
    public ResponseEntity<ApiResponse<MedicineReminder>> createReminder(@Valid @RequestBody CreateReminderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(reminderService.createReminder(request), "Tạo lịch nhắc thuốc thành công"));
    }

    // 3. Đánh dấu đã uống thuốc
    @PutMapping("/reminders/{reminderId}/take")
    public ResponseEntity<ApiResponse<Void>> markAsTaken(@PathVariable UUID reminderId) {
        reminderService.markAsTaken(reminderId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã ghi nhận uống thuốc"));
    }

    // 4. Đánh giá bác sĩ sau lượt khám
    @PostMapping("/ratings")
    public ResponseEntity<ApiResponse<Void>> createRating(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody CreateRatingRequest request
    ) {
        ratingService.createRating(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(null, "Cảm ơn bạn đã đánh giá dịch vụ"));
    }

    // 5. Xem thông báo cá nhân
    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<List<Notification>>> getMyNotifications(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.ok(
                notificationRepository.findAllByAccount_UserIdAndDeletedFalseOrderByCreatedAtDesc(user.getId()),
                "Lấy thông báo thành công"
        ));
    }

    // Đánh dấu 1 thông báo là đã đọc
    @PutMapping("/notifications/{notificationId}/read")
    public ResponseEntity<ApiResponse<Void>> markNotificationAsRead(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID notificationId
    ) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getAccount().getUserId().equals(user.getId())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã đánh dấu đã đọc"));
    }

    // Đánh dấu tất cả thông báo là đã đọc
    @PutMapping("/notifications/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllNotificationsAsRead(@AuthenticationPrincipal UserPrincipal user) {
        List<Notification> list = notificationRepository.findAllByAccount_UserIdAndDeletedFalseOrderByCreatedAtDesc(user.getId());
        for (Notification n : list) {
            n.setRead(true);
        }
        notificationRepository.saveAll(list);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã đánh dấu tất cả đã đọc"));
    }

    // 6. Dashboard Thống kê dành cho Admin & Trưởng khoa
    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<DashboardStatisticsResponse>> getDashboardStats(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate
    ) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getDashboardStatistics(userPrincipal, startDate, endDate), "Lấy số liệu thống kê thành công"));
    }
}
