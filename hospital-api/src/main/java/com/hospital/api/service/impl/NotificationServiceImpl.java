package com.hospital.api.service.impl;

import com.hospital.api.dto.PushMessagePayload;
import com.hospital.api.dto.request.QueueAlertBatchRequest;
import com.hospital.api.dto.request.SendNotificationRequest;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.Notification;
import com.hospital.api.entity.PatientProfile;
import com.hospital.api.entity.PushDevice;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.NotificationRepository;
import com.hospital.api.repository.PatientProfileRepository;
import com.hospital.api.service.NotificationService;
import com.hospital.api.service.PushDeviceService;
import com.hospital.api.service.PushNotificationProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository;
    private final BookingRepository bookingRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final PushDeviceService pushDeviceService;
    private final PushNotificationProvider pushNotificationProvider;

    @Override
    @Transactional
    public Notification sendNotification(SendNotificationRequest request) {
        Account targetAccount = resolveAccount(request.accountId(), request.bookingCode(), request.phoneNumber());
        if (targetAccount == null) {
            log.warn("Không tìm thấy tài khoản người dùng để gửi thông báo: phone={}, bookingCode={}", 
                    request.phoneNumber(), request.bookingCode());
            return null;
        }

        Notification notification = Notification.builder()
                .account(targetAccount)
                .title(request.title())
                .content(request.content())
                .type(request.type() != null ? request.type() : "GENERAL")
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Gửi thông báo đẩy an toàn (không chứa PII/lâm sàng nhạy cảm, lỗi push không làm rollback giao dịch)
        dispatchPushSafely(targetAccount, saved.getType(), String.valueOf(saved.getNotificationId()), "/(patient)/notifications");

        return saved;
    }

    @Override
    @Transactional
    public List<Notification> sendQueueAlerts(QueueAlertBatchRequest request) {
        List<Notification> created = new ArrayList<>();
        if (request.upcomingPatients() == null || request.upcomingPatients().isEmpty()) {
            return created;
        }

        for (var item : request.upcomingPatients()) {
            Account targetAccount = resolveAccount(null, item.bookingCode(), item.patientPhone());
            if (targetAccount != null) {
                int count = item.remainingCount() != null ? item.remainingCount() : 1;
                String room = request.roomName() != null ? request.roomName() : "Bàn Khám Bác Sĩ";
                String title = "🔔 Sắp đến lượt khám! (Còn " + count + " số nữa)";
                String content = "Kính gửi Ông/Bà " + (item.patientName() != null ? item.patientName() : targetAccount.getFullName()) 
                        + " (STT: " + item.queueCode() + "). Chỉ còn " + count + " lượt nữa là đến lượt khám của bạn tại " 
                        + room + ". Vui lòng chuẩn bị di chuyển tới cửa phòng khám!";

                Notification notif = Notification.builder()
                        .account(targetAccount)
                        .title(title)
                        .content(content)
                        .type("QUEUE_ALERT")
                        .isRead(false)
                        .build();

                Notification saved = notificationRepository.save(notif);
                created.add(saved);

                // Gửi push an toàn về hàng đợi
                dispatchPushSafely(targetAccount, "QUEUE_ALERT", String.valueOf(saved.getNotificationId()), "/(patient)/appointments");
            }
        }
        return created;
    }

    private void dispatchPushSafely(Account account, String type, String referenceId, String deepLink) {
        if (account == null || account.getUserId() == null) {
            return;
        }
        try {
            List<PushDevice> devices = pushDeviceService.getActiveDevicesForAccount(account.getUserId());
            if (devices == null || devices.isEmpty()) {
                return;
            }

            String title = "Cổng Bệnh Nhân";
            String body = "Bạn có thông báo mới từ bệnh viện. Chạm để xem chi tiết.";

            if ("QUEUE_ALERT".equalsIgnoreCase(type)) {
                title = "Thông báo lượt khám";
                body = "Lượt khám của bạn có cập nhật mới. Vui lòng kiểm tra.";
            } else if ("BOOKING".equalsIgnoreCase(type) || "BOOKING_CONFIRMED".equalsIgnoreCase(type)) {
                title = "Lịch khám bệnh";
                body = "Lịch hẹn khám bệnh có cập nhật. Chạm để xem.";
            } else if ("TEST_RESULT".equalsIgnoreCase(type)) {
                title = "Kết quả xét nghiệm";
                body = "Đã có kết quả cận lâm sàng mới. Chạm để xem.";
            } else if ("PRESCRIPTION".equalsIgnoreCase(type)) {
                title = "Đơn thuốc";
                body = "Đơn thuốc đã hoàn tất. Chạm để xem chi tiết.";
            } else if ("PAYMENT".equalsIgnoreCase(type)) {
                title = "Viện phí";
                body = "Giao dịch viện phí đã được xử lý thành công.";
            }

            PushMessagePayload payload = PushMessagePayload.generic(
                    type != null ? type : "GENERAL",
                    title,
                    body,
                    referenceId,
                    deepLink != null ? deepLink : "/(patient)/notifications"
            );

            pushNotificationProvider.sendPush(devices, payload);
        } catch (Exception e) {
            log.warn("Lỗi gửi push notification (được bỏ qua để không gián đoạn luồng chính): {}", e.getMessage());
        }
    }

    private Account resolveAccount(UUID accountId, String bookingCode, String phoneNumber) {
        if (accountId != null) {
            Optional<Account> acc = accountRepository.findById(accountId);
            if (acc.isPresent()) return acc.get();
        }

        if (bookingCode != null && !bookingCode.isBlank()) {
            Optional<Booking> booking = bookingRepository.findByBookingCode(bookingCode);
            if (booking.isPresent()) {
                PatientProfile profile = booking.get().getPatientProfile();
                if (profile != null) {
                    if (profile.getAccount() != null) {
                        return profile.getAccount();
                    }
                    if (profile.getPhoneNumber() != null && !profile.getPhoneNumber().isBlank()) {
                        Optional<Account> acc = accountRepository.findByPhoneNumber(profile.getPhoneNumber().trim());
                        if (acc.isPresent()) return acc.get();
                    }
                }
            }
        }

        if (phoneNumber != null && !phoneNumber.isBlank()) {
            Optional<Account> acc = accountRepository.findByPhoneNumber(phoneNumber.trim());
            if (acc.isPresent()) return acc.get();
        }

        return null;
    }
}
