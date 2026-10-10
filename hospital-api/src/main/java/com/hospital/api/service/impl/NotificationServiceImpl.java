package com.hospital.api.service.impl;

import com.hospital.api.dto.request.QueueAlertBatchRequest;
import com.hospital.api.dto.request.SendNotificationRequest;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.Notification;
import com.hospital.api.entity.PatientProfile;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.NotificationRepository;
import com.hospital.api.repository.PatientProfileRepository;
import com.hospital.api.service.NotificationService;
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

        return notificationRepository.save(notification);
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

                created.add(notificationRepository.save(notif));
            }
        }
        return created;
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
