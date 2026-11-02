package com.hospital.api.service.impl;

import org.springframework.beans.factory.annotation.Autowired;

import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.CheckInWindowStatus;
import com.hospital.api.constant.Role;
import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.dto.request.BookingCreateRequest;
import com.hospital.api.dto.request.AdminBookingRescheduleRequest;
import com.hospital.api.dto.request.KioskBookingRequest;
import com.hospital.api.dto.request.KioskCheckInRequest;
import com.hospital.api.dto.response.BookingResponse;
import com.hospital.api.dto.response.KioskCheckInResponse;
import com.hospital.api.dto.response.AdminBookingResponse;
import com.hospital.api.dto.response.AdminBookingSlotResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final AccountRepository accountRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final RoomRepository roomRepository;
    private final TransactionRepository transactionRepository;
    private final com.hospital.api.service.SlotReservationService slotReservationService;
    private final BookingReceptionTransition reception;
    private final CounterTicketRepository counterTicketRepository;
    private final Clock hospitalClock;

    @Autowired
    public BookingServiceImpl(
            BookingRepository bookingRepository,
            TimeSlotRepository timeSlotRepository,
            PatientProfileRepository patientProfileRepository,
            AccountRepository accountRepository,
            DoctorRepository doctorRepository,
            DoctorScheduleRepository scheduleRepository,
            RoomRepository roomRepository,
            TransactionRepository transactionRepository,
            com.hospital.api.service.SlotReservationService slotReservationService,
            BookingReceptionTransition reception,
            CounterTicketRepository counterTicketRepository,
            Clock hospitalClock
    ) {
        this.bookingRepository = bookingRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.accountRepository = accountRepository;
        this.doctorRepository = doctorRepository;
        this.scheduleRepository = scheduleRepository;
        this.roomRepository = roomRepository;
        this.transactionRepository = transactionRepository;
        this.slotReservationService = slotReservationService;
        this.reception = reception;
        this.counterTicketRepository = counterTicketRepository;
        this.hospitalClock = hospitalClock;
    }

    public BookingServiceImpl(
            BookingRepository bookingRepository,
            TimeSlotRepository timeSlotRepository,
            PatientProfileRepository patientProfileRepository,
            AccountRepository accountRepository,
            DoctorRepository doctorRepository,
            DoctorScheduleRepository scheduleRepository,
            RoomRepository roomRepository,
            TransactionRepository transactionRepository,
            com.hospital.api.service.SlotReservationService slotReservationService,
            BookingReceptionTransition reception,
            Clock hospitalClock
    ) {
        this(bookingRepository, timeSlotRepository, patientProfileRepository, accountRepository,
                doctorRepository, scheduleRepository, roomRepository, transactionRepository,
                slotReservationService, reception, null, hospitalClock);
    }

    @Override
    @Transactional
    public BookingResponse createBooking(UUID accountId, BookingCreateRequest request) {
        // 1. Lấy hồ sơ bệnh nhân và kiểm tra quyền sở hữu
        PatientProfile patientProfile = patientProfileRepository
                .findByPatientProfileIdAndAccount_UserIdAndDeletedFalse(request.patientProfileId(), accountId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân này", HttpStatus.NOT_FOUND));

        // 2. KHÓA DÒNG TimeSlot để chống đặt trùng khi hàng ngàn người truy cập đồng thời
        TimeSlot timeSlot = timeSlotRepository.findByIdWithLock(request.timeSlotId())
                .orElseThrow(() -> new AppException("Khung giờ khám không tồn tại", HttpStatus.NOT_FOUND));

        // 3. Kiểm tra xem slot đã đầy chưa (bao gồm cả holding slots)
        int current = timeSlot.getCurrentBookings() != null ? timeSlot.getCurrentBookings() : 0;
        int holding = timeSlot.getHoldingCount() != null ? timeSlot.getHoldingCount() : 0;
        int maxCap = timeSlot.getMaxCapacity() != null ? timeSlot.getMaxCapacity() : 5;

        if (request.reservationId() != null) {
            slotReservationService.consumeReservation(request.reservationId(), request.timeSlotId(), accountId, request.patientProfileId());
            holding = timeSlot.getHoldingCount() != null ? timeSlot.getHoldingCount() : 0;
        }
        if (current + holding >= maxCap) {
            throw new AppException("Khung giờ khám này đã kín chỗ hoặc đang có người giữ chỗ, vui lòng chọn khung giờ khác", HttpStatus.CONFLICT);
        }

        DoctorSchedule schedule = timeSlot.getDoctorSchedule();
        Doctor doctor = schedule.getDoctor();
        LocalDate bookingDate = schedule.getScheduleDate();

        // 4. Tăng số lượng người đã đặt trong TimeSlot
        timeSlot.setCurrentBookings(current + 1);
        timeSlotRepository.save(timeSlot);

        // 5. Cấp số thứ tự khám trong ngày (1, 2, 3...)
        int queueNumber = reception.nextQueueNumber(doctor, bookingDate);

        // 6. Sinh mã đặt lịch duy nhất: BK + YYYYMMDD + 6 ký tự ngẫu nhiên entropy cao
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        String bookingCode = "BK" + bookingDate.format(DateTimeFormatter.ofPattern("yyyyMMdd")) + randomSuffix;

        BigDecimal fee = doctor.getConsultationFee() != null ? doctor.getConsultationFee() : BigDecimal.ZERO;
        boolean isFree = fee.compareTo(BigDecimal.ZERO) <= 0;
        BookingStatus initialStatus = isFree ? BookingStatus.CONFIRMED : BookingStatus.PENDING_PAYMENT;

        // 7. Tạo Booking
        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .queueNumber(queueNumber)
                .bookingDate(bookingDate)
                .symptoms(request.symptoms())
                .price(fee)
                .status(initialStatus)
                .isPaid(false)
                .patientProfile(patientProfile)
                .timeSlot(timeSlot)
                .doctor(doctor)
                .isPriority(false)
                .build();

        return BookingResponse.fromEntity(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public BookingResponse createKioskBooking(KioskBookingRequest request) {
        reception.lockCounters();
        LocalDate today = LocalDate.now(hospitalClock);

        // 1. Tìm hoặc tạo Account theo số điện thoại
        Account account = accountRepository.findByPhoneNumber(request.phoneNumber())
                .orElseGet(() -> {
                    Account newAcc = new Account();
                    newAcc.setFullName(request.fullName());
                    newAcc.setPhoneNumber(request.phoneNumber());
                    newAcc.setPassword("$2a$10$7Z8bU75wW6yP3oF7aZ3zY.D4g.qZ1rK5Q5qXQ1aY7zJzY7zJzY7zJ");
                    newAcc.setRole(Role.ROLE_PATIENT);
                    return accountRepository.save(newAcc);
                });

        // 2. Tìm hoặc tạo PatientProfile theo họ tên của người khám trong gia đình
        String patientFullName = request.fullName() != null ? request.fullName().trim() : "";
        LocalDate patientDob = request.birthYear() != null ? LocalDate.of(request.birthYear(), 1, 1) : LocalDate.of(1990, 1, 1);

        PatientProfile patientProfile = patientProfileRepository
                .findAllByAccount_UserIdAndDeletedFalse(account.getUserId())
                .stream()
                .filter(p -> p.getFullName() != null && p.getFullName().trim().equalsIgnoreCase(patientFullName))
                .findFirst()
                .orElseGet(() -> {
                    PatientProfile profile = PatientProfile.builder()
                            .account(account)
                            .fullName(patientFullName)
                            .phoneNumber(request.phoneNumber() != null ? request.phoneNumber().trim() : account.getPhoneNumber())
                            .gender(com.hospital.api.constant.Gender.OTHER)
                            .dateOfBirth(patientDob)
                            .build();
                    PatientProfile saved = patientProfileRepository.save(profile);
                    return saved != null ? saved : profile;
                });

        // 3. Tìm Lịch trực hôm nay cho chuyên khoa được chọn
        List<DoctorSchedule> schedules = scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(
                request.departmentId(), today);
        LocalTime currentTime = LocalTime.now(hospitalClock);
        Doctor doctor = null;
        TimeSlot timeSlot = null;
        for (DoctorSchedule schedule : schedules) {
            List<TimeSlot> slots = timeSlotRepository.findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(
                    schedule.getDoctorScheduleId());
            for (TimeSlot candidate : slots) {
                if (candidate.getEndTime() != null && !candidate.getEndTime().isAfter(currentTime)) {
                    continue;
                }
                TimeSlot lockedSlot = timeSlotRepository.findByIdWithLock(candidate.getTimeSlotId()).orElse(null);
                if (lockedSlot == null) {
                    continue;
                }
                int currentBookings = lockedSlot.getCurrentBookings() != null ? lockedSlot.getCurrentBookings() : 0;
                int holdingCount = lockedSlot.getHoldingCount() != null ? lockedSlot.getHoldingCount() : 0;
                int maxCapacity = lockedSlot.getMaxCapacity() != null ? lockedSlot.getMaxCapacity() : 5;
                if (currentBookings + holdingCount >= maxCapacity) {
                    continue;
                }
                lockedSlot.setCurrentBookings(currentBookings + 1);
                timeSlotRepository.save(lockedSlot);
                timeSlot = lockedSlot;
                doctor = schedule.getDoctor();
                break;
            }
            if (timeSlot != null) break;
        }

        // Fallback pass: Nếu đã qua giờ các slot trong ngày nhưng vẫn có bác sĩ trực hôm nay (khám ca tối / ngoài giờ),
        // lấy khung giờ phù hợp của lịch trực hôm nay để tiếp nhận bệnh nhân tại Kiosk.
        if (timeSlot == null && !schedules.isEmpty()) {
            for (DoctorSchedule schedule : schedules) {
                List<TimeSlot> slots = timeSlotRepository.findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(
                        schedule.getDoctorScheduleId());
                for (int i = slots.size() - 1; i >= 0; i--) {
                    TimeSlot candidate = slots.get(i);
                    TimeSlot lockedSlot = timeSlotRepository.findByIdWithLock(candidate.getTimeSlotId()).orElse(null);
                    if (lockedSlot == null) {
                        continue;
                    }
                    int currentBookings = lockedSlot.getCurrentBookings() != null ? lockedSlot.getCurrentBookings() : 0;
                    int holdingCount = lockedSlot.getHoldingCount() != null ? lockedSlot.getHoldingCount() : 0;
                    int maxCapacity = lockedSlot.getMaxCapacity() != null ? lockedSlot.getMaxCapacity() : 5;
                    if (currentBookings + holdingCount >= maxCapacity) {
                        continue;
                    }
                    lockedSlot.setCurrentBookings(currentBookings + 1);
                    timeSlotRepository.save(lockedSlot);
                    timeSlot = lockedSlot;
                    doctor = schedule.getDoctor();
                    break;
                }
                if (timeSlot != null) {
                    break;
                }
            }
        }

        if (timeSlot == null || doctor == null) {
            throw new AppException("Khung giờ đã hết chỗ, vui lòng thử lại sau", HttpStatus.CONFLICT);
        }
        LocalDate bookingDate = today;
        // 4. Cấp số thứ tự khám
        int queueNumber = reception.nextQueueNumber(doctor, today);

        // 5. Sinh mã đặt lịch Kiosk entropy cao
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        String bookingCode = "KIOSK" + today.format(DateTimeFormatter.ofPattern("yyyyMMdd")) + randomSuffix;

        boolean isPriority = Boolean.TRUE.equals(request.isPriority());
        String priorityReason = request.priorityReason();

        // Thuật toán Triage ưu tiên (Học hỏi từ PriorityCalculatorService của revita-be)
        int age = -1;
        if (request.birthYear() != null && request.birthYear() > 1900 && request.birthYear() <= today.getYear()) {
            age = today.getYear() - request.birthYear();
            if (patientProfile != null) {
                patientProfile.setDateOfBirth(LocalDate.of(request.birthYear(), 1, 1));
                patientProfileRepository.save(patientProfile);
            }
        } else if (patientProfile != null && patientProfile.getDateOfBirth() != null) {
            age = java.time.Period.between(patientProfile.getDateOfBirth(), today).getYears();
        }

        if (age >= 65) {
            isPriority = true;
            priorityReason = (priorityReason != null && !priorityReason.isBlank())
                    ? priorityReason
                    : "Ưu tiên Người cao tuổi (" + age + " tuổi)";
        } else if (age >= 0 && age < 6) {
            isPriority = true;
            priorityReason = (priorityReason != null && !priorityReason.isBlank())
                    ? priorityReason
                    : "Ưu tiên Trẻ em dưới 6 tuổi (" + age + " tuổi)";
        }

        BigDecimal kioskFee = doctor.getConsultationFee() != null ? doctor.getConsultationFee() : BigDecimal.valueOf(150000);
        BookingStatus kioskStatus = BookingStatus.CONFIRMED;
        boolean isKioskFree = kioskFee.compareTo(BigDecimal.ZERO) <= 0;
        boolean isPaid = false; // A client payment preference is not verified payment.

        LocalDateTime now = LocalDateTime.now(hospitalClock);
        LocalDateTime dispatchedAt = null;

        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .queueNumber(queueNumber)
                .bookingDate(today)
                .symptoms(request.symptoms() != null ? request.symptoms() : (isPriority ? "Khám ưu tiên tại sảnh Kiosk" : "Khám tiếp nhận tại sảnh Kiosk"))
                .price(kioskFee)
                .status(kioskStatus)
                .isPaid(isPaid)
                .patientProfile(patientProfile)
                .timeSlot(timeSlot)
                .doctor(doctor)
                .isPriority(isPriority)
                .priorityReason(priorityReason)
                .checkedInAt(now)
                .dispatchedAt(dispatchedAt)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        com.hospital.api.constant.CounterType type = isPriority ? com.hospital.api.constant.CounterType.PRIORITY : com.hospital.api.constant.CounterType.GENERAL;
        reception.checkIn(savedBooking, type, false);
        reception.ensureTicket(savedBooking, type, false);
        return BookingResponse.fromEntity(savedBooking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminBookingResponse> getAdminBookings(LocalDate fromDate, LocalDate toDate) {
        LocalDate start = fromDate != null ? fromDate : LocalDate.now(hospitalClock);
        LocalDate end = toDate != null ? toDate : start;
        if (end.isBefore(start) || end.isAfter(start.plusDays(90))) {
            throw new AppException("Khoảng ngày lọc không hợp lệ (tối đa 90 ngày)", HttpStatus.BAD_REQUEST);
        }
        return bookingRepository.findAllByBookingDateBetweenAndDeletedFalse(start, end).stream()
                .map(AdminBookingResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminBookingSlotResponse> getAdminBookingSlots(LocalDate date, Integer departmentId) {
        LocalDate targetDate = date != null ? date : LocalDate.now(hospitalClock);
        if (departmentId == null || targetDate.isBefore(LocalDate.now(hospitalClock))) {
            throw new AppException("Vui lòng chọn chuyên khoa và ngày khám hợp lệ", HttpStatus.BAD_REQUEST);
        }
        LocalTime now = LocalTime.now(hospitalClock);
        return timeSlotRepository.findAllForDepartmentAndDate(departmentId, targetDate).stream()
                .filter(slot -> slot.getEndTime() == null || targetDate.isAfter(LocalDate.now(hospitalClock)) || slot.getEndTime().isAfter(now))
                .filter(slot -> (slot.getCurrentBookings() != null ? slot.getCurrentBookings() : 0)
                        + (slot.getHoldingCount() != null ? slot.getHoldingCount() : 0)
                        < (slot.getMaxCapacity() != null ? slot.getMaxCapacity() : 5))
                .map(AdminBookingSlotResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public AdminBookingResponse rescheduleBooking(UUID bookingId, AdminBookingRescheduleRequest request) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new AppException("Lịch hẹn không tồn tại", HttpStatus.NOT_FOUND));
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.COMPLETED
                || booking.getStatus() == BookingStatus.IN_PROGRESS || booking.getCheckedInAt() != null) {
            throw new AppException("Không thể đổi lịch đã hủy, đã check-in, đang khám hoặc đã hoàn tất", HttpStatus.CONFLICT);
        }

        reception.lockCounters(); // Same order as kiosk/reception before locking multiple slots.
        TimeSlot oldSlot = booking.getTimeSlot();
        if (oldSlot != null && oldSlot.getTimeSlotId().equals(request.timeSlotId())) {
            return AdminBookingResponse.fromEntity(booking);
        }
        java.util.List<UUID> slotIds = new java.util.ArrayList<>();
        slotIds.add(request.timeSlotId());
        if (oldSlot != null) slotIds.add(oldSlot.getTimeSlotId());
        slotIds.sort(java.util.Comparator.naturalOrder());
        java.util.Map<UUID, TimeSlot> lockedSlots = new java.util.HashMap<>();
        for (UUID slotId : slotIds) lockedSlots.put(slotId, timeSlotRepository.findByIdWithLock(slotId)
                .orElseThrow(() -> new AppException("Khung giờ không tồn tại", HttpStatus.NOT_FOUND)));
        TimeSlot newSlot = lockedSlots.get(request.timeSlotId());
        DoctorSchedule newSchedule = newSlot.getDoctorSchedule();
        LocalDate today = LocalDate.now(hospitalClock);
        if (newSchedule.getScheduleDate().isBefore(today)
                || (newSchedule.getScheduleDate().isEqual(today)
                && newSlot.getStartTime() != null && !newSlot.getStartTime().isAfter(LocalTime.now(hospitalClock)))) {
            throw new AppException("Không thể chuyển lịch sang khung giờ đã bắt đầu", HttpStatus.CONFLICT);
        }
        Integer currentDepartmentId = booking.getDoctor() != null && booking.getDoctor().getDepartment() != null
                ? booking.getDoctor().getDepartment().getDepartmentId() : null;
        UUID previousDoctorId = booking.getDoctor() != null ? booking.getDoctor().getDoctorId() : null;
        LocalDate previousBookingDate = booking.getBookingDate();
        Integer targetDepartmentId = newSchedule.getDoctor() != null && newSchedule.getDoctor().getDepartment() != null
                ? newSchedule.getDoctor().getDepartment().getDepartmentId() : null;
        if (!java.util.Objects.equals(currentDepartmentId, targetDepartmentId)) {
            throw new AppException("Khung giờ mới phải thuộc cùng chuyên khoa", HttpStatus.BAD_REQUEST);
        }

        int nextCurrent = newSlot.getCurrentBookings() != null ? newSlot.getCurrentBookings() : 0;
        int holding = newSlot.getHoldingCount() != null ? newSlot.getHoldingCount() : 0;
        int capacity = newSlot.getMaxCapacity() != null ? newSlot.getMaxCapacity() : 5;
        if (nextCurrent + holding >= capacity) {
            throw new AppException("Khung giờ mới đã hết chỗ, vui lòng chọn khung giờ khác", HttpStatus.CONFLICT);
        }

        if (oldSlot != null) {
            TimeSlot lockedOldSlot = lockedSlots.get(oldSlot.getTimeSlotId());
            int oldCount = lockedOldSlot.getCurrentBookings() != null ? lockedOldSlot.getCurrentBookings() : 0;
            lockedOldSlot.setCurrentBookings(Math.max(0, oldCount - 1));
            timeSlotRepository.save(lockedOldSlot);
        }
        newSlot.setCurrentBookings(nextCurrent + 1);
        timeSlotRepository.save(newSlot);
        booking.setTimeSlot(newSlot);
        booking.setDoctor(newSchedule.getDoctor());
        booking.setBookingDate(newSchedule.getScheduleDate());
        if (!java.util.Objects.equals(previousDoctorId, newSchedule.getDoctor().getDoctorId())
                || !previousBookingDate.isEqual(newSchedule.getScheduleDate())) {
            booking.setQueueNumber(reception.nextQueueNumber(newSchedule.getDoctor(), newSchedule.getScheduleDate()));
        }
        return AdminBookingResponse.fromEntity(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public void adminCancelBooking(UUID bookingId) {
        cancelBooking(null, bookingId, true);
    }

    @Override
    @Transactional
    public void cancelBooking(UUID accountId, UUID bookingId, boolean isStaff) {
        Booking booking = bookingRepository.findByIdWithLock(bookingId)
                .orElseThrow(() -> new AppException("Lịch hẹn không tồn tại", HttpStatus.NOT_FOUND));

        if (!isStaff) {
            boolean isOwner = booking.getPatientProfile() != null
                    && booking.getPatientProfile().getAccount() != null
                    && booking.getPatientProfile().getAccount().getUserId().equals(accountId);
            if (!isOwner) {
                throw new AppException("Bạn không có quyền hủy lịch khám của bệnh nhân khác", HttpStatus.FORBIDDEN);
            }
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Lịch hẹn đã được hủy trước đó", HttpStatus.CONFLICT);
        }
        if (booking.getStatus() == BookingStatus.COMPLETED || booking.getStatus() == BookingStatus.IN_PROGRESS
                || booking.getCheckedInAt() != null) {
            throw new AppException("Không thể hủy lịch đã tiếp đón, đang khám hoặc đã hoàn tất", HttpStatus.CONFLICT);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        // Hủy mọi phiếu quầy còn đang chờ phục vụ
        List<CounterTicket> linkedTickets = counterTicketRepository != null ? counterTicketRepository.findAllByBookingForUpdate(booking.getBookingId()) : null;
        if (linkedTickets != null) {
            for (CounterTicket ticket : linkedTickets) {
                if (ticket.getStatus() == com.hospital.api.constant.CounterTicketStatus.WAITING ||
                    ticket.getStatus() == com.hospital.api.constant.CounterTicketStatus.CALLING) {
                    ticket.setStatus(com.hospital.api.constant.CounterTicketStatus.SKIPPED);
                    counterTicketRepository.save(ticket);
                }
            }
        }

        if (booking.getTimeSlot() != null) {
            TimeSlot slot = timeSlotRepository.findByIdWithLock(booking.getTimeSlot().getTimeSlotId())
                    .orElse(booking.getTimeSlot());
            int current = slot.getCurrentBookings() != null ? slot.getCurrentBookings() : 0;
            if (current > 0) {
                slot.setCurrentBookings(current - 1);
                timeSlotRepository.save(slot);
            }
        }

        // Hoàn tiền vào ví tài khoản bệnh nhân nếu đã thanh toán trước
        if (Boolean.TRUE.equals(booking.getIsPaid()) && booking.getPrice() != null && booking.getPrice().compareTo(BigDecimal.ZERO) > 0) {
            Account account = booking.getPatientProfile() != null ? booking.getPatientProfile().getAccount() : null;
            if (account != null) {
                BigDecimal currentBalance = account.getBalance() != null ? account.getBalance() : BigDecimal.ZERO;
                account.setBalance(currentBalance.add(booking.getPrice()));
                accountRepository.save(account);

                Transaction refundTx = Transaction.builder()
                        .account(account)
                        .amount(booking.getPrice())
                        .transactionType(TransactionType.REFUND)
                        .status("SUCCESS")
                        .description("Hoàn tiền hủy lịch khám mã " + booking.getBookingCode())
                        .paymentMethod(PaymentMethod.INTERNAL_WALLET)
                        .build();
                transactionRepository.save(refundTx);
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(UUID accountId) {
        return bookingRepository.findAllByPatientProfile_Account_UserIdAndDeletedFalseOrderByCreatedAtDesc(accountId)
                .stream()
                .map(b -> {
                    String tCode = null;
                    Integer qNum = null;
                    String cName = null;
                    try {
                        var tickets = counterTicketRepository != null ? counterTicketRepository.findAllByBooking(b.getBookingId()) : null;
                        if (tickets != null && !tickets.isEmpty()) {
                            var latest = tickets.get(tickets.size() - 1);
                            tCode = latest.getTicketCode();
                            qNum = latest.getQueueNumber();
                            cName = latest.getCounter() != null ? latest.getCounter().getCounterName() : null;
                        }
                    } catch (Exception ignored) {
                        // Safe fallback - avoid failing user booking history if ticket resolution fails
                    }
                    return BookingResponse.fromEntity(b, tCode, qNum, cName);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingByCode(String bookingCode) {
        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new AppException("Không tìm thấy phiếu đặt khám", HttpStatus.NOT_FOUND));

        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isStaffOrOwner = false;
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            if (auth.getPrincipal() instanceof com.hospital.api.security.UserPrincipal principal) {
                boolean isOwner = booking.getPatientProfile() != null
                        && booking.getPatientProfile().getAccount() != null
                        && booking.getPatientProfile().getAccount().getUserId().equals(principal.getId());
                boolean isStaff = auth.getAuthorities().stream().anyMatch(a ->
                        a.getAuthority().contains("DOCTOR") ||
                        a.getAuthority().contains("NURSE") ||
                        a.getAuthority().contains("CASHIER") ||
                        a.getAuthority().contains("ADMIN") ||
                        a.getAuthority().contains("HEAD_OF_DEPARTMENT")
                );
                if (isOwner || isStaff) {
                    isStaffOrOwner = true;
                }
            }
        }

        String tCode = null;
        Integer qNum = null;
        String cName = null;
        try {
            var tickets = counterTicketRepository != null ? counterTicketRepository.findAllByBooking(booking.getBookingId()) : null;
            if (tickets != null && !tickets.isEmpty()) {
                var latest = tickets.get(tickets.size() - 1);
                tCode = latest.getTicketCode();
                qNum = latest.getQueueNumber();
                cName = latest.getCounter() != null ? latest.getCounter().getCounterName() : null;
            }
        } catch (Exception ignored) {
            // Safe fallback
        }

        BookingResponse response = BookingResponse.fromEntity(booking, tCode, qNum, cName);
        if (!isStaffOrOwner) {
            String maskedName = maskPatientName(response.patientName());
            return response.withMaskedPatientInfo(maskedName, maskPhoneNumber(response.patientPhone()));
        }
        return response;
    }

    private String maskPhoneNumber(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 3);
    }

    private String maskPatientName(String name) {
        if (name == null || name.isBlank() || "N/A".equalsIgnoreCase(name)) {
            return name;
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].length() > 2 ? parts[0].charAt(0) + "***" : parts[0];
        }
        StringBuilder sb = new StringBuilder();
        sb.append(parts[0]).append(" ");
        for (int i = 1; i < parts.length - 1; i++) {
            sb.append(parts[i].charAt(0)).append("*** ");
        }
        sb.append(parts[parts.length - 1]);
        return sb.toString();
    }

    @Override
    @Transactional
    public KioskCheckInResponse checkInKiosk(KioskCheckInRequest request) {
        String input = request.bookingCodeOrPhone() != null ? request.bookingCodeOrPhone().trim() : "";
        if (input.isEmpty()) {
            throw new AppException("Mã đặt khám hoặc số điện thoại không được để trống", HttpStatus.BAD_REQUEST);
        }

        LocalDate today = LocalDate.now(hospitalClock);
        LocalTime now = LocalTime.now(hospitalClock);

        // 1. Tìm booking: ưu tiên theo mã booking_code
        Booking booking = bookingRepository.findByBookingCodeForUpdate(input).orElse(null);

        // 2. Nếu không tìm thấy theo mã, thử tìm theo số điện thoại trong ngày hôm nay
        if (booking == null) {
            List<String> matches = bookingRepository.findActiveBookingCodesByPhoneAndDate(input, today,
                    List.of(BookingStatus.CANCELLED, BookingStatus.COMPLETED));
            if (matches.size() > 1) throw new AppException("Có nhiều lịch khám, vui lòng nhập mã đặt khám chính xác", HttpStatus.CONFLICT);
            booking = matches.isEmpty() ? null : bookingRepository.findByBookingCodeForUpdate(matches.get(0)).orElse(null);
        }

        if (booking == null) {
            throw new AppException("Không tìm thấy thông tin lịch khám tương ứng với mã hoặc số điện thoại: " + input, HttpStatus.NOT_FOUND);
        }

        boolean alreadyCheckedIn = booking.getCheckedInAt() != null;

        // 3. Kiểm tra trạng thái hủy hoặc hoàn tất
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Lịch khám này đã bị hủy trước đó!", HttpStatus.BAD_REQUEST);
        }
        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new AppException("Lịch khám này đã hoàn tất trước đó!", HttpStatus.BAD_REQUEST);
        }

        // 4. Kiểm tra ngày khám (Check-in Window - Date Guard)
        if (!booking.getBookingDate().isEqual(today)) {
            String dateFormatted = booking.getBookingDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            throw new AppException("Lịch khám của bạn vào ngày " + dateFormatted + ". Hệ thống chỉ tiếp nhận check-in trong đúng ngày khám!", HttpStatus.BAD_REQUEST);
        }

        // 5. Kiểm tra khung giờ khám (Check-in Window - Time Guard, học hỏi E-healthcare)
        TimeSlot slot = booking.getTimeSlot();
        if (!alreadyCheckedIn && slot != null && slot.getStartTime() != null && slot.getEndTime() != null) {
            LocalDateTime startDateTime = LocalDateTime.of(booking.getBookingDate(), slot.getStartTime());
            LocalDateTime endDateTime = LocalDateTime.of(booking.getBookingDate(), slot.getEndTime());
            LocalDateTime currentDateTime = LocalDateTime.of(today, now);

            // Ngưỡng: sớm tối đa 60 phút
            LocalDateTime earlyAllowedDateTime = startDateTime.minusMinutes(60);
            if (currentDateTime.isBefore(earlyAllowedDateTime)) {
                throw new AppException("Chưa đến khung giờ tiếp nhận. Bạn chỉ có thể check-in từ "
                        + earlyAllowedDateTime.format(DateTimeFormatter.ofPattern("HH:mm"))
                        + " (trước giờ khám tối đa 60 phút). Giờ khám của bạn là "
                        + slot.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")) + " - " + slot.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm")) + "!",
                        HttpStatus.BAD_REQUEST);
            }

            // Ngưỡng: trễ tối đa 15 phút sau khi kết thúc ca khám
            LocalDateTime lateAllowedDateTime = endDateTime.plusMinutes(15);
            if (currentDateTime.isAfter(lateAllowedDateTime)) {
                throw new AppException("Đã quá thời gian tiếp nhận ca khám (quá 15 phút sau kết thúc khung giờ: "
                        + lateAllowedDateTime.format(DateTimeFormatter.ofPattern("HH:mm"))
                        + "). Vui lòng đến Quầy tiếp đón để được nhân viên y tế hỗ trợ phân luồng lại!",
                        HttpStatus.BAD_REQUEST);
            }
        }

        reception.checkIn(booking, com.hospital.api.constant.CounterType.APPOINTMENT, false);
        boolean isPaid = Boolean.TRUE.equals(booking.getIsPaid());
        Booking savedBooking = bookingRepository.save(booking);

        // 7. Chuẩn bị thông tin phản hồi
        boolean priority = Boolean.TRUE.equals(savedBooking.getIsPriority());
        String qCode = (priority ? "UT-" : "KB-") + String.format("%02d", savedBooking.getQueueNumber());
        String roomName = (slot != null && slot.getDoctorSchedule() != null && slot.getDoctorSchedule().getRoom() != null)
                ? slot.getDoctorSchedule().getRoom().getRoomName()
                : "Phòng khám chuyên khoa";
        String deptName = (savedBooking.getDoctor() != null && savedBooking.getDoctor().getDepartment() != null)
                ? savedBooking.getDoctor().getDepartment().getDepartmentName()
                : "Khoa khám bệnh";
        String doctorName = (savedBooking.getDoctor() != null && savedBooking.getDoctor().getAccount() != null)
                ? savedBooking.getDoctor().getAccount().getFullName()
                : "Bác sĩ phụ trách";
        String timeSlotRange = (slot != null && slot.getStartTime() != null && slot.getEndTime() != null)
                ? (slot.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")) + " - " + slot.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm")))
                : "Trong ngày";

        String message;
        if (isPaid) {
            message = "Check-in thành công! Bạn đã hoàn tất thanh toán, vui lòng di chuyển thẳng đến " + roomName + " (" + deptName + ") chờ Bác sĩ gọi số.";
        } else {
            message = "Check-in thành công! Lịch khám chưa thanh toán viện phí, vui lòng quét mã QR hoặc nộp tại Quầy tiếp đón để vào buồng khám " + roomName + ".";
        }

        return new KioskCheckInResponse(
                savedBooking.getBookingId(),
                savedBooking.getBookingCode(),
                savedBooking.getQueueNumber(),
                qCode,
                savedBooking.getPatientProfile() != null ? savedBooking.getPatientProfile().getFullName() : "N/A",
                savedBooking.getPatientProfile() != null ? savedBooking.getPatientProfile().getPhoneNumber() : "",
                doctorName,
                deptName,
                roomName,
                savedBooking.getBookingDate(),
                timeSlotRange,
                CheckInWindowStatus.OPEN,
                priority,
                savedBooking.getPriorityReason(),
                message,
                savedBooking.getCheckedInAt(),
                isPaid,
                savedBooking.getPrice(),
                savedBooking.getDispatchedAt()
        );
    }

    @Override
    @Transactional
    public KioskCheckInResponse payKioskBooking(com.hospital.api.dto.request.KioskPayRequest request) {
        String code = request.bookingCode() != null ? request.bookingCode().trim() : "";
        Booking booking = bookingRepository.findByBookingCodeForUpdate(code)
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin lịch khám: " + code, HttpStatus.NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Lịch khám này đã bị hủy trước đó!", HttpStatus.BAD_REQUEST);
        }

        if (!Boolean.TRUE.equals(booking.getIsPaid())) {
            throw new AppException("Chưa có xác nhận thanh toán từ cổng thanh toán", HttpStatus.CONFLICT);
        }
        // Read the verified result only; this request cannot create payment, check-in, or dispatch.
        BigDecimal amount = booking.getPrice();
        Booking saved = booking;

        TimeSlot slot = saved.getTimeSlot();
        boolean priority = Boolean.TRUE.equals(saved.getIsPriority());
        String qCode = (priority ? "UT-" : "KB-") + String.format("%02d", saved.getQueueNumber());
        String roomName = (slot != null && slot.getDoctorSchedule() != null && slot.getDoctorSchedule().getRoom() != null)
                ? slot.getDoctorSchedule().getRoom().getRoomName()
                : "Phòng khám chuyên khoa";
        String deptName = (saved.getDoctor() != null && saved.getDoctor().getDepartment() != null)
                ? saved.getDoctor().getDepartment().getDepartmentName()
                : "Khoa khám bệnh";
        String doctorName = (saved.getDoctor() != null && saved.getDoctor().getAccount() != null)
                ? saved.getDoctor().getAccount().getFullName()
                : "Bác sĩ phụ trách";
        String timeSlotRange = (slot != null && slot.getStartTime() != null && slot.getEndTime() != null)
                ? (slot.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")) + " - " + slot.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm")))
                : "Trong ngày";

        String message = saved.getDispatchedAt() != null
                ? "Đã xác nhận thanh toán. Vui lòng đến " + roomName + " (" + deptName + ") chờ Bác sĩ gọi số."
                : "Đã ghi nhận thanh toán. Vui lòng chờ tiếp đón xác nhận phân phòng khám.";

        return new KioskCheckInResponse(
                saved.getBookingId(),
                saved.getBookingCode(),
                saved.getQueueNumber(),
                qCode,
                saved.getPatientProfile() != null ? saved.getPatientProfile().getFullName() : "N/A",
                saved.getPatientProfile() != null ? saved.getPatientProfile().getPhoneNumber() : "",
                doctorName,
                deptName,
                roomName,
                saved.getBookingDate(),
                timeSlotRange,
                CheckInWindowStatus.OPEN,
                priority,
                saved.getPriorityReason(),
                message,
                saved.getCheckedInAt(),
                true,
                amount,
                saved.getDispatchedAt()
        );
    }
}
