package com.hospital.api.service.impl;

import com.hospital.api.constant.CounterStatus;
import com.hospital.api.constant.CounterTicketStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.dto.request.CounterActionRequest;
import com.hospital.api.dto.request.KioskDispatchRequest;
import com.hospital.api.dto.response.CounterResponse;
import com.hospital.api.dto.response.CounterTicketResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.CounterService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CounterServiceImpl implements CounterService {

    private final CounterRepository counterRepository;
    private final CounterAssignmentRepository assignmentRepository;
    private final CounterTicketRepository counterTicketRepository;
    private final AccountRepository accountRepository;
    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final com.hospital.api.service.BookingService bookingService;

    @PostConstruct
    @Transactional
    public void init() {
        initializeDefaultCountersIfEmpty();
    }

    @Override
    @Transactional
    public void initializeDefaultCountersIfEmpty() {
        if (counterRepository.count() == 0) {
            log.info("Khởi tạo danh mục 5 Quầy tiếp đón mặc định tại sảnh...");
            List<Counter> defaultCounters = List.of(
                    Counter.builder()
                            .counterCode("CTR-01")
                            .counterName("Quầy 1 - Tiếp đón Thường")
                            .counterType(CounterType.GENERAL)
                            .location("Sảnh A - Tầng 1")
                            .status(CounterStatus.OPEN)
                            .displayOrder(1)
                            .maxCapacity(100)
                            .build(),
                    Counter.builder()
                            .counterCode("CTR-02")
                            .counterName("Quầy 2 - Tiếp đón Thường")
                            .counterType(CounterType.GENERAL)
                            .location("Sảnh A - Tầng 1")
                            .status(CounterStatus.OPEN)
                            .displayOrder(2)
                            .maxCapacity(100)
                            .build(),
                    Counter.builder()
                            .counterCode("CTR-03")
                            .counterName("Quầy 3 - Tiếp nhận BHYT")
                            .counterType(CounterType.INSURANCE)
                            .location("Sảnh A - Tầng 1")
                            .status(CounterStatus.OPEN)
                            .displayOrder(3)
                            .maxCapacity(80)
                            .build(),
                    Counter.builder()
                            .counterCode("CTR-04")
                            .counterName("Quầy 4 - Tiếp đón Ưu tiên")
                            .counterType(CounterType.PRIORITY)
                            .location("Sảnh A - Tầng 1")
                            .status(CounterStatus.OPEN)
                            .displayOrder(4)
                            .maxCapacity(60)
                            .build(),
                    Counter.builder()
                            .counterCode("CTR-05")
                            .counterName("Quầy 5 - Tiếp nhận Đặt hẹn")
                            .counterType(CounterType.APPOINTMENT)
                            .location("Sảnh B - Tầng 1 (Fast-track)")
                            .status(CounterStatus.OPEN)
                            .displayOrder(5)
                            .maxCapacity(100)
                            .build()
            );
            counterRepository.saveAll(defaultCounters);
            log.info("Đã tạo thành công 5 Quầy tiếp đón!");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<CounterResponse> getAllCounters() {
        LocalDate today = LocalDate.now();
        List<Counter> counters = counterRepository.findAllByDeletedFalseOrderByDisplayOrderAsc();
        return counters.stream().map(counter -> {
            int waiting = counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                    counter.getCounterId(), today, CounterTicketStatus.WAITING
            );
            return CounterResponse.fromEntity(counter, waiting);
        }).toList();
    }

    @Override
    @Transactional
    public CounterResponse checkInCounter(Integer counterId, UUID staffId) {
        Counter counter = counterRepository.findById(counterId)
                .orElseThrow(() -> new AppException("Quầy không tồn tại", HttpStatus.NOT_FOUND));

        Account staff = accountRepository.findById(staffId)
                .orElseThrow(() -> new AppException("Tài khoản nhân viên không tồn tại", HttpStatus.NOT_FOUND));

        // Đóng các phiên trực cũ nếu có
        assignmentRepository.findByCounter_CounterIdAndIsActiveTrueAndDeletedFalse(counterId)
                .ifPresent(oldAssign -> {
                    oldAssign.setIsActive(false);
                    oldAssign.setShiftEnd(LocalDateTime.now());
                    assignmentRepository.save(oldAssign);
                });

        // Tạo phiên trực mới
        CounterAssignment newAssign = CounterAssignment.builder()
                .counter(counter)
                .staff(staff)
                .shiftStart(LocalDateTime.now())
                .isActive(true)
                .build();
        assignmentRepository.save(newAssign);

        counter.setStatus(CounterStatus.OPEN);
        counter.setCurrentStaff(staff);
        Counter saved = counterRepository.save(counter);

        int waiting = counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                counterId, LocalDate.now(), CounterTicketStatus.WAITING
        );
        return CounterResponse.fromEntity(saved, waiting);
    }

    @Override
    @Transactional
    public CounterResponse closeCounter(Integer counterId, UUID staffId) {
        Counter counter = counterRepository.findById(counterId)
                .orElseThrow(() -> new AppException("Quầy không tồn tại", HttpStatus.NOT_FOUND));

        assignmentRepository.findByCounter_CounterIdAndIsActiveTrueAndDeletedFalse(counterId)
                .ifPresent(assign -> {
                    assign.setIsActive(false);
                    assign.setShiftEnd(LocalDateTime.now());
                    assignmentRepository.save(assign);
                });

        counter.setStatus(CounterStatus.CLOSED);
        counter.setCurrentStaff(null);
        Counter saved = counterRepository.save(counter);

        int waiting = counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                counterId, LocalDate.now(), CounterTicketStatus.WAITING
        );
        return CounterResponse.fromEntity(saved, waiting);
    }

    @Override
    @Transactional
    public CounterResponse pauseCounter(Integer counterId, UUID staffId) {
        Counter counter = counterRepository.findById(counterId)
                .orElseThrow(() -> new AppException("Quầy không tồn tại", HttpStatus.NOT_FOUND));

        counter.setStatus(CounterStatus.PAUSED);
        Counter saved = counterRepository.save(counter);

        int waiting = counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                counterId, LocalDate.now(), CounterTicketStatus.WAITING
        );
        return CounterResponse.fromEntity(saved, waiting);
    }

    @Override
    @Transactional
    public CounterTicketResponse dispatchFromKiosk(KioskDispatchRequest request) {
        LocalDate today = LocalDate.now();

        // 1. Phân loại đối tượng và loại quầy (Thuật toán Triage học từ revita-be)
        CounterType targetType = CounterType.GENERAL;
        String prefix = "TH-";
        boolean isPriority = Boolean.TRUE.equals(request.isPriority());
        String priorityReason = request.priorityReason();

        int age = -1;
        if (request.birthYear() != null && request.birthYear() > 1900 && request.birthYear() <= today.getYear()) {
            age = today.getYear() - request.birthYear();
        }

        if (age >= 65) {
            isPriority = true;
            priorityReason = (priorityReason != null && !priorityReason.isBlank())
                    ? priorityReason : "Người cao tuổi (" + age + " tuổi)";
        } else if (age >= 0 && age < 6) {
            isPriority = true;
            priorityReason = (priorityReason != null && !priorityReason.isBlank())
                    ? priorityReason : "Trẻ nhỏ dưới 6 tuổi (" + age + " tuổi)";
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

        final CounterType finalTargetType = targetType;

        // 2. Thuật toán Định tuyến Quầy & Cân bằng tải (Least-loaded Dispatching)
        List<Counter> candidates = counterRepository.findAllByCounterTypeAndStatusAndDeletedFalse(finalTargetType, CounterStatus.OPEN);
        if (candidates.isEmpty()) {
            // Thử tìm các quầy đang BUSY
            candidates = counterRepository.findAllByCounterTypeAndStatusAndDeletedFalse(finalTargetType, CounterStatus.BUSY);
        }

        // Nếu quầy chuyên biệt chưa mở, thử định tuyến sang các quầy GENERAL đang OPEN
        if (candidates.isEmpty()) {
            candidates = counterRepository.findAllByCounterTypeAndStatusAndDeletedFalse(CounterType.GENERAL, CounterStatus.OPEN);
        }

        // Nếu toàn bộ quầy đều đóng, lấy bất kỳ quầy phù hợp nào theo loại
        if (candidates.isEmpty()) {
            candidates = counterRepository.findAllByDeletedFalseOrderByDisplayOrderAsc().stream()
                    .filter(c -> c.getCounterType() == finalTargetType)
                    .toList();
        }

        // Fallback cuối cùng
        if (candidates.isEmpty()) {
            candidates = counterRepository.findAllByDeletedFalseOrderByDisplayOrderAsc();
        }

        if (candidates.isEmpty()) {
            throw new AppException("Hệ thống quầy tiếp đón chưa được thiết lập!", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Chọn quầy có số người đang chờ ít nhất (Cân bằng tải)
        Counter selectedCounter = candidates.stream()
                .min(Comparator.comparingInt(c -> counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                        c.getCounterId(), today, CounterTicketStatus.WAITING
                )))
                .orElse(candidates.get(0));

        // 3. Cấp số thứ tự trong ngày theo loại quầy
        int totalForType = counterTicketRepository.countByTicketDateAndCounterType(today, targetType);
        int queueNumber = totalForType + 1;
        String ticketCode = prefix + String.format("%02d", queueNumber);

        // 4. Số người đang chờ trước
        int waitingBefore = counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                selectedCounter.getCounterId(), today, CounterTicketStatus.WAITING
        );

        Booking linkedBooking = null;
        if (request.bookingCode() != null && !request.bookingCode().isBlank()) {
            linkedBooking = bookingRepository.findByBookingCode(request.bookingCode()).orElse(null);
        } else if (request.departmentId() != null) {
            try {
                com.hospital.api.dto.request.KioskBookingRequest kioskReq = new com.hospital.api.dto.request.KioskBookingRequest(
                        request.fullName(),
                        request.phoneNumber(),
                        request.departmentId(),
                        request.birthYear(),
                        isPriority,
                        priorityReason,
                        Boolean.TRUE.equals(request.hasInsurance()) ? "Đăng ký khám BHYT" : "Khám dịch vụ tự động từ Kiosk"
                );
                com.hospital.api.dto.response.BookingResponse bkResp = bookingService.createKioskBooking(kioskReq);
                if (bkResp != null && bkResp.bookingCode() != null) {
                    linkedBooking = bookingRepository.findByBookingCode(bkResp.bookingCode()).orElse(null);
                }
            } catch (Exception e) {
                log.warn("Không thể tạo tự động ca khám liên kết cho phiếu Kiosk: {}", e.getMessage());
            }
        }

        CounterTicket ticket = CounterTicket.builder()
                .ticketCode(ticketCode)
                .queueNumber(queueNumber)
                .ticketDate(today)
                .counterType(targetType)
                .counter(selectedCounter)
                .booking(linkedBooking)
                .patientName(request.fullName())
                .phoneNumber(request.phoneNumber())
                .isPriority(isPriority)
                .priorityReason(priorityReason)
                .hasInsurance(Boolean.TRUE.equals(request.hasInsurance()))
                .status(CounterTicketStatus.WAITING)
                .build();

        CounterTicket savedTicket = counterTicketRepository.save(ticket);
        log.info("Cây Kiosk đã cấp phiếu {} định tuyến vào {} (Trước mặt: {} người)",
                ticketCode, selectedCounter.getCounterName(), waitingBefore);

        return CounterTicketResponse.fromEntity(savedTicket, waitingBefore);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CounterTicketResponse> getQueueForCounter(Integer counterId) {
        LocalDate today = LocalDate.now();
        List<CounterTicket> tickets = counterTicketRepository.findAllByCounter_CounterIdAndTicketDateOrderByQueueNumberAsc(
                counterId, today
        );
        return tickets.stream().map(t -> {
            int waitingBefore = 0;
            if (t.getStatus() == CounterTicketStatus.WAITING) {
                waitingBefore = (int) tickets.stream()
                        .filter(other -> other.getStatus() == CounterTicketStatus.WAITING && other.getQueueNumber() < t.getQueueNumber())
                        .count();
            }
            return CounterTicketResponse.fromEntity(t, waitingBefore);
        }).toList();
    }

    @Override
    @Transactional
    public CounterTicketResponse callNextTicket(Integer counterId, UUID staffId) {
        LocalDate today = LocalDate.now();
        Counter counter = counterRepository.findById(counterId)
                .orElseThrow(() -> new AppException("Quầy không tồn tại", HttpStatus.NOT_FOUND));

        CounterTicket nextTicket = counterTicketRepository
                .findFirstByCounter_CounterIdAndTicketDateAndStatusOrderByQueueNumberAsc(
                        counterId, today, CounterTicketStatus.WAITING
                )
                .orElseThrow(() -> new AppException("Hiện không còn bệnh nhân nào đang chờ tại quầy này!", HttpStatus.BAD_REQUEST));

        nextTicket.setStatus(CounterTicketStatus.CALLING);
        nextTicket.setCalledAt(LocalDateTime.now());
        CounterTicket saved = counterTicketRepository.save(nextTicket);

        // Cập nhật trạng thái hiển thị của quầy
        counter.setCurrentServingNumber(saved.getQueueNumber());
        counter.setCurrentTicketCode(saved.getTicketCode());
        counter.setStatus(CounterStatus.BUSY);
        counterRepository.save(counter);

        log.info("Quầy {} gọi bệnh nhân {} (Số {})", counter.getCounterName(), saved.getPatientName(), saved.getTicketCode());
        return CounterTicketResponse.fromEntity(saved, 0);
    }

    @Override
    @Transactional
    public CounterTicketResponse completeTicket(Long ticketId, Integer counterId, UUID staffId, CounterActionRequest request) {
        CounterTicket ticket = counterTicketRepository.findById(ticketId)
                .orElseThrow(() -> new AppException("Phiếu tiếp đón không tồn tại", HttpStatus.NOT_FOUND));

        ticket.setStatus(CounterTicketStatus.SERVED);
        ticket.setServedAt(LocalDateTime.now());
        if (request != null && request.targetRoomId() != null) {
            ticket.setDispatchedRoomId(request.targetRoomId());
        }
        CounterTicket saved = counterTicketRepository.save(ticket);

        Counter counter = counterRepository.findById(counterId).orElse(null);
        if (counter != null) {
            counter.setStatus(CounterStatus.OPEN);
            counterRepository.save(counter);
        }

        log.info("Đã hoàn tất tiếp nhận cho phiếu {}", saved.getTicketCode());
        return CounterTicketResponse.fromEntity(saved, 0);
    }

    @Override
    @Transactional
    public CounterTicketResponse skipTicket(Long ticketId, Integer counterId, UUID staffId) {
        CounterTicket ticket = counterTicketRepository.findById(ticketId)
                .orElseThrow(() -> new AppException("Phiếu tiếp đón không tồn tại", HttpStatus.NOT_FOUND));

        ticket.setStatus(CounterTicketStatus.SKIPPED);
        CounterTicket saved = counterTicketRepository.save(ticket);

        Counter counter = counterRepository.findById(counterId).orElse(null);
        if (counter != null) {
            counter.setStatus(CounterStatus.OPEN);
            counterRepository.save(counter);
        }

        log.info("Đã bỏ qua phiếu {} do vắng mặt", saved.getTicketCode());
        return CounterTicketResponse.fromEntity(saved, 0);
    }
}
