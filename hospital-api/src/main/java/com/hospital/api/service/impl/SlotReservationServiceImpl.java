package com.hospital.api.service.impl;

import com.hospital.api.dto.request.ReserveSlotRequest;
import com.hospital.api.dto.response.ReserveSlotResponse;
import com.hospital.api.entity.TimeSlot;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.TimeSlotRepository;
import com.hospital.api.service.SlotReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlotReservationServiceImpl implements SlotReservationService {

    private static final long RESERVATION_TTL_SECONDS = 600; // 10 phút (TTL 600s giống E-healthcare)

    public record ReservationEntry(
            UUID reservationId,
            UUID timeSlotId,
            UUID accountId,
            UUID patientProfileId,
            Instant expiresAt
    ) {}

    private final TimeSlotRepository timeSlotRepository;
    private final Map<UUID, ReservationEntry> activeReservations = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public ReserveSlotResponse reserveSlot(ReserveSlotRequest request, UUID accountId) {
        TimeSlot slot = timeSlotRepository.findById(request.timeSlotId())
                .orElseThrow(() -> new AppException("Không tìm thấy khung giờ khám", HttpStatus.NOT_FOUND));

        int effectiveCurrent = slot.getCurrentBookings() != null ? slot.getCurrentBookings() : 0;
        int effectiveHolding = slot.getHoldingCount() != null ? slot.getHoldingCount() : 0;
        int maxCap = slot.getMaxCapacity() != null ? slot.getMaxCapacity() : 5;

        if (effectiveCurrent + effectiveHolding >= maxCap) {
            throw new AppException("Khung giờ này vừa có người giữ chỗ hoặc đã kín lịch khám. Vui lòng chọn khung giờ khác.", HttpStatus.CONFLICT);
        }

        UUID reservationId = UUID.randomUUID();
        Instant expiresAt = Instant.now().plus(Duration.ofSeconds(RESERVATION_TTL_SECONDS));

        // Tăng số lượng giữ chỗ trong DB
        slot.setHoldingCount(effectiveHolding + 1);
        timeSlotRepository.save(slot);

        // Lưu vào active reservations cache
        ReservationEntry entry = new ReservationEntry(
                reservationId,
                slot.getTimeSlotId(),
                accountId,
                request.patientProfileId(),
                expiresAt
        );
        activeReservations.put(reservationId, entry);

        log.info("Đã giữ chỗ khung giờ {} cho reservationId: {} (hết hạn sau {}s)", slot.getTimeSlotId(), reservationId, RESERVATION_TTL_SECONDS);

        return new ReserveSlotResponse(
                reservationId,
                slot.getTimeSlotId(),
                expiresAt,
                RESERVATION_TTL_SECONDS,
                "Khung giờ khám đã được giữ chỗ tạm thời trong 10 phút. Vui lòng hoàn tất thanh toán để xác nhận lịch khám."
        );
    }

    @Override
    @Transactional
    public void releaseSlot(UUID reservationId) {
        ReservationEntry entry = activeReservations.remove(reservationId);
        if (entry == null) {
            return;
        }

        timeSlotRepository.findById(entry.timeSlotId()).ifPresent(slot -> {
            int currentHolding = slot.getHoldingCount() != null ? slot.getHoldingCount() : 0;
            if (currentHolding > 0) {
                slot.setHoldingCount(currentHolding - 1);
                timeSlotRepository.save(slot);
                log.info("Đã giải phóng 1 slot giữ chỗ cho khung giờ {}", slot.getTimeSlotId());
            }
        });
    }

    @Override
    @Transactional
    public void confirmSlotReservation(UUID reservationId) {
        ReservationEntry entry = activeReservations.remove(reservationId);
        if (entry == null) {
            return;
        }

        timeSlotRepository.findById(entry.timeSlotId()).ifPresent(slot -> {
            int currentHolding = slot.getHoldingCount() != null ? slot.getHoldingCount() : 0;
            if (currentHolding > 0) {
                slot.setHoldingCount(currentHolding - 1);
                timeSlotRepository.save(slot);
                log.info("Đã xác nhận đặt khám thành công, chuyển slot giữ chỗ thành đặt chính thức cho khung giờ {}", slot.getTimeSlotId());
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isSlotAvailable(UUID timeSlotId) {
        return timeSlotRepository.findById(timeSlotId).map(slot -> {
            int current = slot.getCurrentBookings() != null ? slot.getCurrentBookings() : 0;
            int holding = slot.getHoldingCount() != null ? slot.getHoldingCount() : 0;
            int maxCap = slot.getMaxCapacity() != null ? slot.getMaxCapacity() : 5;
            return current + holding < maxCap;
        }).orElse(false);
    }

    /**
     * Tự động quét và giải phóng các slot giữ chỗ quá 10 phút (chạy mỗi 10 giây)
     */
    @Scheduled(fixedRate = 10000)
    @Transactional
    public void cleanupExpiredReservations() {
        Instant now = Instant.now();
        for (Map.Entry<UUID, ReservationEntry> e : activeReservations.entrySet()) {
            if (e.getValue().expiresAt().isBefore(now)) {
                log.warn("Reservation {} đã hết hạn 10 phút mà chưa thanh toán. Tự động giải phóng slot.", e.getKey());
                releaseSlot(e.getKey());
            }
        }
    }
}
