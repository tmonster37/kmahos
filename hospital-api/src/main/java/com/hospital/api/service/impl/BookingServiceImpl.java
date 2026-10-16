package com.hospital.api.service.impl;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.CheckInWindowStatus;
import com.hospital.api.constant.Role;
import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.dto.request.BookingCreateRequest;
import com.hospital.api.dto.request.KioskBookingRequest;
import com.hospital.api.dto.request.KioskCheckInRequest;
import com.hospital.api.dto.response.BookingResponse;
import com.hospital.api.dto.response.KioskCheckInResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final AccountRepository accountRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final RoomRepository roomRepository;
    private final com.hospital.api.service.SlotReservationService slotReservationService;

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
            slotReservationService.confirmSlotReservation(request.reservationId());
        } else {
            if (current + holding >= maxCap) {
                throw new AppException("Khung giờ khám này đã kín chỗ hoặc đang có người giữ chỗ, vui lòng chọn khung giờ khác", HttpStatus.BAD_REQUEST);
            }
        }

        DoctorSchedule schedule = timeSlot.getDoctorSchedule();
        Doctor doctor = schedule.getDoctor();
        LocalDate bookingDate = schedule.getScheduleDate();

        // 4. Tăng số lượng người đã đặt trong TimeSlot
        timeSlot.setCurrentBookings(timeSlot.getCurrentBookings() + 1);
        timeSlotRepository.save(timeSlot);

        // 5. Cấp số thứ tự khám trong ngày (1, 2, 3...)
        int currentCount = bookingRepository.countBookingsByDoctorAndDate(doctor.getDoctorId(), bookingDate);
        int queueNumber = currentCount + 1;

        // 6. Sinh mã đặt lịch duy nhất: BK + YYYYMMDD + 6 ký tự ngẫu nhiên entropy cao
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        String bookingCode = "BK" + bookingDate.format(DateTimeFormatter.ofPattern("yyyyMMdd")) + randomSuffix;

        // 7. Tạo Booking
        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .queueNumber(queueNumber)
                .bookingDate(bookingDate)
                .symptoms(request.symptoms())
                .price(doctor.getConsultationFee())
                .status(BookingStatus.CONFIRMED)
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
        LocalDate today = LocalDate.now();

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

        // 2. Tìm hoặc tạo PatientProfile
        PatientProfile patientProfile = patientProfileRepository
                .findAllByAccount_UserIdAndDeletedFalse(account.getUserId())
                .stream().findFirst()
                .orElseGet(() -> {
                    PatientProfile profile = PatientProfile.builder()
                            .account(account)
                            .fullName(request.fullName())
                            .phoneNumber(request.phoneNumber())
                            .gender(com.hospital.api.constant.Gender.OTHER)
                            .dateOfBirth(LocalDate.of(1990, 1, 1))
                            .build();
                    return patientProfileRepository.save(profile);
                });

        // 3. Tìm Lịch trực hôm nay cho chuyên khoa được chọn
        List<DoctorSchedule> schedules = scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(
                request.departmentId(), today
        );

        Doctor doctor;
        TimeSlot timeSlot;

        if (!schedules.isEmpty()) {
            DoctorSchedule schedule = schedules.get(0);
            doctor = schedule.getDoctor();
            List<TimeSlot> slots = timeSlotRepository.findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(
                    schedule.getDoctorScheduleId()
            );
            if (!slots.isEmpty()) {
                timeSlot = slots.get(0);
                timeSlot.setCurrentBookings(timeSlot.getCurrentBookings() + 1);
                timeSlotRepository.save(timeSlot);
            } else {
                timeSlot = timeSlotRepository.save(TimeSlot.builder()
                        .doctorSchedule(schedule)
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(17, 0))
                        .maxCapacity(100)
                        .currentBookings(1)
                        .build());
            }
        } else {
            List<Doctor> doctors = doctorRepository.findAllByDepartment_DepartmentIdAndDeletedFalse(request.departmentId());
            if (doctors.isEmpty()) {
                doctors = doctorRepository.findAllByDeletedFalse();
            }
            if (doctors.isEmpty()) {
                throw new AppException("Hiện chưa có Bác sĩ trực thuộc chuyên khoa này!", HttpStatus.BAD_REQUEST);
            }
            doctor = doctors.get(0);

            // Tìm hoặc tạo phòng khám cho chuyên khoa
            List<Room> deptRooms = roomRepository.findAllByDepartment_DepartmentIdAndDeletedFalse(request.departmentId());
            if (deptRooms.isEmpty()) {
                deptRooms = roomRepository.findAllByDeletedFalse();
            }
            Room room = !deptRooms.isEmpty() ? deptRooms.get(0) : roomRepository.findAll().stream().findFirst().orElse(null);

            // Kiểm tra hoặc tạo lịch trực & khung giờ khám hôm nay
            List<DoctorSchedule> existingDocSchedules = scheduleRepository.findAllByDoctor_DoctorIdAndScheduleDateBetweenAndDeletedFalse(
                    doctor.getDoctorId(), today, today
            );
            DoctorSchedule schedule;
            if (!existingDocSchedules.isEmpty()) {
                schedule = existingDocSchedules.get(0);
            } else {
                schedule = scheduleRepository.save(DoctorSchedule.builder()
                        .doctor(doctor)
                        .room(room)
                        .scheduleDate(today)
                        .session(ScheduleSession.MORNING)
                        .build());
            }

            List<TimeSlot> existingSlots = timeSlotRepository.findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(
                    schedule.getDoctorScheduleId()
            );
            if (!existingSlots.isEmpty()) {
                timeSlot = existingSlots.get(0);
                timeSlot.setCurrentBookings(timeSlot.getCurrentBookings() + 1);
                timeSlotRepository.save(timeSlot);
            } else {
                timeSlot = timeSlotRepository.save(TimeSlot.builder()
                        .doctorSchedule(schedule)
                        .startTime(LocalTime.of(7, 30))
                        .endTime(LocalTime.of(17, 30))
                        .maxCapacity(200)
                        .currentBookings(1)
                        .build());
            }
        }

        if (timeSlot == null) {
            timeSlot = timeSlotRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new AppException("Hệ thống chưa thiết lập khung giờ khám cho hôm nay!", HttpStatus.INTERNAL_SERVER_ERROR));
        }

        // 4. Cấp số thứ tự khám
        int currentCount = bookingRepository.countBookingsByDoctorAndDate(doctor.getDoctorId(), today);
        int queueNumber = currentCount + 1;

        // 5. Sinh mã đặt lịch Kiosk entropy cao
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        String bookingCode = "KIOSK" + today.format(DateTimeFormatter.ofPattern("yyyyMMdd")) + randomSuffix;

        boolean isPriority = Boolean.TRUE.equals(request.isPriority());
        String priorityReason = request.priorityReason();

        // Thuật toán Triage ưu tiên (Học hỏi từ PriorityCalculatorService của revita-be)
        int age = -1;
        if (request.birthYear() != null && request.birthYear() > 1900 && request.birthYear() <= today.getYear()) {
            age = today.getYear() - request.birthYear();
            patientProfile.setDateOfBirth(LocalDate.of(request.birthYear(), 1, 1));
            patientProfileRepository.save(patientProfile);
        } else if (patientProfile.getDateOfBirth() != null) {
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

        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .queueNumber(queueNumber)
                .bookingDate(today)
                .symptoms(request.symptoms() != null ? request.symptoms() : (isPriority ? "Khám ưu tiên tại sảnh Kiosk" : "Khám tiếp nhận tại sảnh Kiosk"))
                .price(doctor.getConsultationFee() != null ? doctor.getConsultationFee() : BigDecimal.valueOf(150000))
                .status(BookingStatus.CONFIRMED)
                .patientProfile(patientProfile)
                .timeSlot(timeSlot)
                .doctor(doctor)
                .isPriority(isPriority)
                .priorityReason(priorityReason)
                .build();

        return BookingResponse.fromEntity(bookingRepository.save(booking));
    }

    @Override
    public List<BookingResponse> getMyBookings(UUID accountId) {
        return bookingRepository.findAllByPatientProfile_Account_UserIdAndDeletedFalseOrderByCreatedAtDesc(accountId)
                .stream()
                .map(BookingResponse::fromEntity)
                .toList();
    }

    @Override
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

        BookingResponse response = BookingResponse.fromEntity(booking);
        if (!isStaffOrOwner) {
            String maskedName = maskPatientName(response.patientName());
            return new BookingResponse(
                    response.bookingId(),
                    response.bookingCode(),
                    response.queueNumber(),
                    response.queueCode(),
                    response.isPriority(),
                    response.priorityReason(),
                    response.bookingDate(),
                    response.startTime(),
                    response.endTime(),
                    maskedName,
                    response.doctorName(),
                    response.departmentName(),
                    response.roomName(),
                    response.price(),
                    response.status(),
                    null // Bảo vệ bí mật y tế: Không trả về triệu chứng bệnh lý cho truy vấn công khai
            );
        }
        return response;
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
    public void cancelBooking(UUID accountId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException("Lịch hẹn khám không tồn tại", HttpStatus.NOT_FOUND));

        if (!booking.getPatientProfile().getAccount().getUserId().equals(accountId)) {
            throw new AppException("Bạn không có quyền hủy lịch khám này", HttpStatus.FORBIDDEN);
        }

        if (booking.getStatus() == BookingStatus.COMPLETED || booking.getStatus() == BookingStatus.IN_PROGRESS) {
            throw new AppException("Không thể hủy lịch khám đang diễn ra hoặc đã hoàn tất", HttpStatus.BAD_REQUEST);
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException("Lịch khám này đã được hủy trước đó", HttpStatus.BAD_REQUEST);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        if (booking.getTimeSlot() != null && booking.getTimeSlot().getCurrentBookings() > 0) {
            TimeSlot slot = booking.getTimeSlot();
            slot.setCurrentBookings(slot.getCurrentBookings() - 1);
            timeSlotRepository.save(slot);
        }
    }

    @Override
    @Transactional
    public KioskCheckInResponse checkInKiosk(KioskCheckInRequest request) {
        String input = request.bookingCodeOrPhone() != null ? request.bookingCodeOrPhone().trim() : "";
        if (input.isEmpty()) {
            throw new AppException("Mã đặt khám hoặc số điện thoại không được để trống", HttpStatus.BAD_REQUEST);
        }

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        // 1. Tìm booking: ưu tiên theo mã booking_code
        Booking booking = bookingRepository.findByBookingCode(input).orElse(null);

        // 2. Nếu không tìm thấy theo mã, thử tìm theo số điện thoại trong ngày hôm nay
        if (booking == null) {
            List<Booking> todayBookings = bookingRepository.findAllByPatientProfile_PhoneNumberAndBookingDateAndDeletedFalse(input, today);
            booking = todayBookings.stream()
                    .filter(b -> b.getStatus() != BookingStatus.CANCELLED && b.getStatus() != BookingStatus.COMPLETED)
                    .findFirst()
                    .orElse(null);
        }

        if (booking == null) {
            throw new AppException("Không tìm thấy thông tin lịch khám tương ứng với mã hoặc số điện thoại: " + input, HttpStatus.NOT_FOUND);
        }

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
        if (slot != null && slot.getStartTime() != null && slot.getEndTime() != null) {
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

        // 6. Cập nhật trạng thái và bảo đảm có số thứ tự
        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            booking.setStatus(BookingStatus.CONFIRMED);
        }
        if (booking.getQueueNumber() == null || booking.getQueueNumber() <= 0) {
            int queueNumber = bookingRepository.countBookingsByDoctorAndDate(booking.getDoctor().getDoctorId(), today) + 1;
            booking.setQueueNumber(queueNumber);
        }
        bookingRepository.save(booking);

        // 7. Chuẩn bị thông tin phản hồi
        boolean priority = Boolean.TRUE.equals(booking.getIsPriority());
        String qCode = (priority ? "UT-" : "KB-") + String.format("%02d", booking.getQueueNumber());
        String roomName = (slot != null && slot.getDoctorSchedule() != null && slot.getDoctorSchedule().getRoom() != null)
                ? slot.getDoctorSchedule().getRoom().getRoomName()
                : "Phòng khám chuyên khoa";
        String deptName = (booking.getDoctor() != null && booking.getDoctor().getDepartment() != null)
                ? booking.getDoctor().getDepartment().getDepartmentName()
                : "Khoa khám bệnh";
        String doctorName = (booking.getDoctor() != null && booking.getDoctor().getAccount() != null)
                ? booking.getDoctor().getAccount().getFullName()
                : "Bác sĩ phụ trách";
        String timeSlotRange = (slot != null && slot.getStartTime() != null && slot.getEndTime() != null)
                ? (slot.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")) + " - " + slot.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm")))
                : "Trong ngày";

        String message = "Check-in thành công! Vui lòng nhận phiếu in nhiệt và di chuyển đến " + roomName + " (" + deptName + ").";

        return new KioskCheckInResponse(
                booking.getBookingId(),
                booking.getBookingCode(),
                booking.getQueueNumber(),
                qCode,
                booking.getPatientProfile() != null ? booking.getPatientProfile().getFullName() : "N/A",
                booking.getPatientProfile() != null ? booking.getPatientProfile().getPhoneNumber() : "",
                doctorName,
                deptName,
                roomName,
                booking.getBookingDate(),
                timeSlotRange,
                CheckInWindowStatus.OPEN,
                priority,
                booking.getPriorityReason(),
                message,
                java.time.LocalDateTime.now()
        );
    }
}
