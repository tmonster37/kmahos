package com.hospital.api.service.impl;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.Role;
import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.dto.request.BookingCreateRequest;
import com.hospital.api.dto.request.KioskBookingRequest;
import com.hospital.api.dto.response.BookingResponse;
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

        // 3. Kiểm tra xem slot đã đầy chưa
        if (timeSlot.getCurrentBookings() >= timeSlot.getMaxCapacity()) {
            throw new AppException("Khung giờ khám này đã kín chỗ, vui lòng chọn khung giờ khác", HttpStatus.BAD_REQUEST);
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

        // 6. Sinh mã đặt lịch duy nhất: BK + YYYYMMDD + 4 số ngẫu nhiên
        String randomSuffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
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

        // 5. Sinh mã đặt lịch
        String randomSuffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        String bookingCode = "KIOSK" + today.format(DateTimeFormatter.ofPattern("yyyyMMdd")) + randomSuffix;

        boolean isPriority = Boolean.TRUE.equals(request.isPriority());

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
                .priorityReason(request.priorityReason())
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
        return BookingResponse.fromEntity(booking);
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
}
