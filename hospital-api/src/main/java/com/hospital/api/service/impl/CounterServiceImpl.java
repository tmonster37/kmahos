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
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Clock;
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
    private final KioskDispatchTransactionService kioskDispatchTransactionService;
    private final BookingReceptionTransition reception;
    private final Clock clock;

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
        LocalDate today = LocalDate.now(clock);
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
                    oldAssign.setShiftEnd(LocalDateTime.now(clock));
                    assignmentRepository.save(oldAssign);
                });

        // Tạo phiên trực mới
        CounterAssignment newAssign = CounterAssignment.builder()
                .counter(counter)
                .staff(staff)
                .shiftStart(LocalDateTime.now(clock))
                .isActive(true)
                .build();
        assignmentRepository.save(newAssign);

        counter.setStatus(CounterStatus.OPEN);
        counter.setCurrentStaff(staff);
        Counter saved = counterRepository.save(counter);

        int waiting = counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                counterId, LocalDate.now(clock), CounterTicketStatus.WAITING
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
                    assign.setShiftEnd(LocalDateTime.now(clock));
                    assignmentRepository.save(assign);
                });

        counter.setStatus(CounterStatus.CLOSED);
        counter.setCurrentStaff(null);
        Counter saved = counterRepository.save(counter);

        int waiting = counterTicketRepository.countByCounter_CounterIdAndTicketDateAndStatus(
                counterId, LocalDate.now(clock), CounterTicketStatus.WAITING
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
                counterId, LocalDate.now(clock), CounterTicketStatus.WAITING
        );
        return CounterResponse.fromEntity(saved, waiting);
    }

    @Override
    public CounterTicketResponse dispatchFromKiosk(KioskDispatchRequest request) {
        String key = request.idempotencyKey();
        CounterTicket existing = counterTicketRepository.findByIdempotencyKeyAndDeletedFalse(key).orElse(null);
        if (existing != null) {
            int waitingBefore = existing.getWaitingBefore() != null ? existing.getWaitingBefore() : 0;
            return CounterTicketResponse.fromEntity(existing, waitingBefore);
        }

        try {
            return kioskDispatchTransactionService.dispatch(request);
        } catch (DataIntegrityViolationException duplicateKey) {
            CounterTicket committed = counterTicketRepository.findByIdempotencyKeyAndDeletedFalse(key).orElse(null);
            if (committed == null) {
                throw duplicateKey;
            }
            int waitingBefore = committed.getWaitingBefore() != null ? committed.getWaitingBefore() : 0;
            return CounterTicketResponse.fromEntity(committed, waitingBefore);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<CounterTicketResponse> getQueueForCounter(Integer counterId) {
        LocalDate today = LocalDate.now(clock);
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
        LocalDate today = LocalDate.now(clock);
        Counter counter = counterRepository.findById(counterId)
                .orElseThrow(() -> new AppException("Quầy không tồn tại", HttpStatus.NOT_FOUND));

        CounterTicket nextTicket = counterTicketRepository
                .findFirstByCounter_CounterIdAndTicketDateAndStatusOrderByQueueNumberAsc(
                        counterId, today, CounterTicketStatus.WAITING
                )
                .orElseThrow(() -> new AppException("Hiện không còn bệnh nhân nào đang chờ tại quầy này!", HttpStatus.BAD_REQUEST));

        nextTicket.setStatus(CounterTicketStatus.CALLING);
        nextTicket.setCalledAt(LocalDateTime.now(clock));
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
        var initial = counterTicketRepository.findLinkById(ticketId)
                .orElseThrow(() -> new AppException("Phiếu tiếp đón không tồn tại", HttpStatus.NOT_FOUND));
        if (initial.getBookingId() == null)
            throw new AppException("Phiếu tiếp đón chưa gắn lượt khám", HttpStatus.CONFLICT);
        Booking booking = bookingRepository.findByIdWithLock(initial.getBookingId())
                .orElseThrow(() -> new AppException("Không tìm thấy lượt khám", HttpStatus.NOT_FOUND));
        reception.lockCounters();
        CounterTicket ticket = counterTicketRepository.findByIdForUpdate(ticketId)
                .orElseThrow(() -> new AppException("Phiếu tiếp đón không tồn tại", HttpStatus.NOT_FOUND));
        if (ticket.getStatus() == CounterTicketStatus.SKIPPED) throw new AppException("Phiếu đã bỏ qua", HttpStatus.CONFLICT);
        if (ticket.getStatus() == CounterTicketStatus.SERVED) {
            if (!BookingReceptionTransition.paymentEligible(booking)) throw new AppException("PAYMENT_REQUIRED: Chưa thanh toán", HttpStatus.PAYMENT_REQUIRED);
            if (!BookingReceptionTransition.doctorEligible(booking)) throw new AppException("Phiếu kết thúc chưa có điều phối hợp lệ", HttpStatus.CONFLICT);
            return CounterTicketResponse.fromEntity(ticket, 0);
        }
        reception.dispatchTo(booking, request == null ? null : request.targetRoomId(), null, null);
        ticket.setStatus(CounterTicketStatus.SERVED);
        ticket.setServedAt(LocalDateTime.now(clock));
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
        var link = counterTicketRepository.findLinkById(ticketId)
                .orElseThrow(() -> new AppException("Phiếu tiếp đón không tồn tại", HttpStatus.NOT_FOUND));
        if (link.getBookingId() != null) bookingRepository.findByIdWithLock(link.getBookingId())
                .orElseThrow(() -> new AppException("Lượt khám không tồn tại", HttpStatus.CONFLICT));
        reception.lockCounters();
        CounterTicket ticket = counterTicketRepository.findByIdForUpdate(ticketId)
                .orElseThrow(() -> new AppException("Phiếu tiếp đón không tồn tại", HttpStatus.NOT_FOUND));
        if (ticket.getStatus() == CounterTicketStatus.SERVED) throw new AppException("Phiếu đã phục vụ", HttpStatus.CONFLICT);
        if (ticket.getStatus() == CounterTicketStatus.SKIPPED) return CounterTicketResponse.fromEntity(ticket, 0);
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
