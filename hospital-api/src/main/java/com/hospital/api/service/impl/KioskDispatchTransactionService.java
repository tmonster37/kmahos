package com.hospital.api.service.impl;

import com.hospital.api.constant.CounterStatus;
import com.hospital.api.constant.CounterTicketStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.dto.request.KioskBookingRequest;
import com.hospital.api.dto.request.KioskDispatchRequest;
import com.hospital.api.dto.response.BookingResponse;
import com.hospital.api.dto.response.CounterTicketResponse;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.Counter;
import com.hospital.api.entity.CounterTicket;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.CounterRepository;
import com.hospital.api.repository.CounterTicketRepository;
import com.hospital.api.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class KioskDispatchTransactionService {

    private final CounterRepository counterRepository;
    private final CounterTicketRepository counterTicketRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final Clock hospitalClock;

    @Transactional
    public CounterTicketResponse dispatch(KioskDispatchRequest request) {
        LocalDate today = LocalDate.now(hospitalClock);
        CounterType targetType = CounterType.GENERAL;
        String prefix = "TH-";
        boolean isPriority = Boolean.TRUE.equals(request.isPriority());
        String priorityReason = request.priorityReason();

        int age = request.birthYear() != null && request.birthYear() > 1900 && request.birthYear() <= today.getYear()
                ? today.getYear() - request.birthYear() : -1;
        if (age >= 65) {
            isPriority = true;
            if (priorityReason == null || priorityReason.isBlank()) {
                priorityReason = "Người cao tuổi (" + age + " tuổi)";
            }
        } else if (age >= 0 && age < 6) {
            isPriority = true;
            if (priorityReason == null || priorityReason.isBlank()) {
                priorityReason = "Trẻ nhỏ dưới 6 tuổi (" + age + " tuổi)";
            }
        }

        if (isPriority) {
            targetType = CounterType.PRIORITY;
            prefix = "UT-";
        } else if (request.bookingCode() != null && !request.bookingCode().isBlank()) {
            targetType = CounterType.APPOINTMENT;
            prefix = "AP-";
        } else if (Boolean.TRUE.equals(request.hasInsurance())) {
            targetType = CounterType.INSURANCE;
            prefix = "BH-";
        }

        final CounterType allocationType = targetType;
        List<Counter> lockedCounters = lockCountersForDispatch(allocationType);

        CounterTicket existing = counterTicketRepository
                .findByIdempotencyKeyAndDeletedFalse(request.idempotencyKey())
                .orElse(null);
        if (existing != null) {
            int waitingBefore = existing.getWaitingBefore() != null ? existing.getWaitingBefore() : 0;
            return CounterTicketResponse.fromEntity(existing, waitingBefore);
        }

        List<Counter> typeCounters = lockedCounters.stream()
                .filter(counter -> counter.getCounterType() == allocationType)
                .toList();
        List<Counter> generalCounters = allocationType == CounterType.GENERAL
                ? typeCounters
                : lockedCounters.stream().filter(counter -> counter.getCounterType() == CounterType.GENERAL).toList();

        List<Counter> candidates = typeCounters.stream()
                .filter(counter -> counter.getStatus() == CounterStatus.OPEN)
                .toList();
        if (candidates.isEmpty()) {
            candidates = typeCounters.stream()
                    .filter(counter -> counter.getStatus() == CounterStatus.BUSY)
                    .toList();
        }
        if (candidates.isEmpty()) {
            candidates = generalCounters.stream()
                    .filter(counter -> counter.getStatus() == CounterStatus.OPEN)
                    .toList();
        }
        if (candidates.isEmpty()) {
            candidates = typeCounters;
        }
        if (candidates.isEmpty()) {
            candidates = lockedCounters;
        }
        if (candidates.isEmpty()) {
            throw new AppException("Hệ thống quầy tiếp đón chưa được thiết lập", HttpStatus.SERVICE_UNAVAILABLE);
        }

        Counter selectedCounter = candidates.stream()
                .min(Comparator.comparingInt(counter -> counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                        counter.getCounterId(), today, CounterTicketStatus.WAITING)))
                .orElse(candidates.get(0));

        int queueNumber = counterTicketRepository.countByTicketDateAndCounterType(today, allocationType) + 1;
        String ticketCode = prefix + String.format("%02d", queueNumber);
        int waitingBefore = counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                selectedCounter.getCounterId(), today, CounterTicketStatus.WAITING);

        Booking linkedBooking;
        if (request.bookingCode() != null && !request.bookingCode().isBlank()) {
            linkedBooking = bookingRepository.findByBookingCode(request.bookingCode())
                    .orElseThrow(() -> new AppException("Không tìm thấy lịch hẹn", HttpStatus.NOT_FOUND));
        } else {
            BookingResponse bookingResponse = bookingService.createKioskBooking(new KioskBookingRequest(
                    request.fullName(), request.phoneNumber(), request.departmentId(), request.birthYear(),
                    isPriority, priorityReason,
                    Boolean.TRUE.equals(request.hasInsurance()) ? "Đăng ký khám BHYT" : "Khám dịch vụ tự động từ Kiosk"
            ));
            linkedBooking = bookingRepository.findByBookingCode(bookingResponse.bookingCode())
                    .orElseThrow(() -> new IllegalStateException("Kiosk booking was not persisted"));
        }

        CounterTicket ticket = CounterTicket.builder()
                .ticketCode(ticketCode)
                .idempotencyKey(request.idempotencyKey())
                .waitingBefore(waitingBefore)
                .queueNumber(queueNumber)
                .ticketDate(today)
                .counterType(allocationType)
                .counter(selectedCounter)
                .booking(linkedBooking)
                .patientName(request.fullName())
                .phoneNumber(request.phoneNumber())
                .isPriority(isPriority)
                .priorityReason(priorityReason)
                .hasInsurance(Boolean.TRUE.equals(request.hasInsurance()))
                .status(CounterTicketStatus.WAITING)
                .build();

        CounterTicket savedTicket = counterTicketRepository.saveAndFlush(ticket);
        return CounterTicketResponse.fromEntity(savedTicket, waitingBefore);
    }

    private List<Counter> lockCountersForDispatch(CounterType targetType) {
        List<CounterType> lockTypes = targetType == CounterType.GENERAL
                ? List.of(CounterType.GENERAL)
                : List.of(targetType, CounterType.GENERAL);
        // When the requested type is absent, the query locks all rows in id order as a shared fallback.
        return counterRepository.findAllForKioskDispatchForUpdate(targetType, lockTypes);
    }
}
