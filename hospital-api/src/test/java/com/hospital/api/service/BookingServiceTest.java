package com.hospital.api.service;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.Degree;
import com.hospital.api.constant.Role;
import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.dto.request.BookingCreateRequest;
import com.hospital.api.dto.request.KioskCheckInRequest;
import com.hospital.api.dto.request.AdminBookingRescheduleRequest;
import com.hospital.api.dto.response.BookingResponse;
import com.hospital.api.controller.AdminBookingController;
import com.hospital.api.controller.BookingController;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.DoctorScheduleRepository;
import com.hospital.api.repository.PatientProfileRepository;
import com.hospital.api.repository.RoomRepository;
import com.hospital.api.repository.TimeSlotRepository;
import com.hospital.api.service.impl.BookingServiceImpl;
import com.hospital.api.service.SlotReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private TimeSlotRepository timeSlotRepository;

    @Mock
    private PatientProfileRepository patientProfileRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private DoctorScheduleRepository scheduleRepository;

    @Mock
    private SlotReservationService slotReservationService;

    private Clock hospitalClock;
    private BookingServiceImpl bookingService;

    private UUID accountId;
    private UUID patientProfileId;
    private UUID timeSlotId;
    private UUID doctorId;
    private PatientProfile testProfile;
    private Doctor testDoctor;
    private DoctorSchedule testSchedule;
    private TimeSlot testSlot;

    @BeforeEach
    void setUp() {
        hospitalClock = Clock.fixed(Instant.parse("2026-10-23T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        bookingService = new BookingServiceImpl(bookingRepository, timeSlotRepository, patientProfileRepository,
                accountRepository, doctorRepository, scheduleRepository, mock(RoomRepository.class),
                slotReservationService, hospitalClock);
        accountId = UUID.randomUUID();
        patientProfileId = UUID.randomUUID();
        timeSlotId = UUID.randomUUID();
        doctorId = UUID.randomUUID();

        Account patientAccount = Account.builder()
                .userId(accountId)
                .fullName("Benh Nhan Test")
                .role(Role.ROLE_PATIENT)
                .build();

        testProfile = PatientProfile.builder()
                .patientProfileId(patientProfileId)
                .account(patientAccount)
                .fullName("Nguyen Van Benh Nhan")
                .phoneNumber("0987654321")
                .build();

        Department department = Department.builder()
                .departmentId(1)
                .departmentName("Khoa Tim Mach")
                .build();

        Account doctorAccount = Account.builder()
                .userId(UUID.randomUUID())
                .fullName("BS. Le Van B")
                .role(Role.ROLE_DOCTOR)
                .build();

        testDoctor = Doctor.builder()
                .doctorId(doctorId)
                .account(doctorAccount)
                .department(department)
                .degree(Degree.BSCKI)
                .consultationFee(BigDecimal.valueOf(180000))
                .build();

        Room testRoom = Room.builder()
                .roomId(102)
                .roomName("Phòng Khám 102")
                .department(department)
                .build();

        testSchedule = DoctorSchedule.builder()
                .doctorScheduleId(UUID.randomUUID())
                .doctor(testDoctor)
                .room(testRoom)
                .scheduleDate(LocalDate.now().plusDays(1))
                .session(ScheduleSession.MORNING)
                .build();

        testSlot = TimeSlot.builder()
                .timeSlotId(timeSlotId)
                .doctorSchedule(testSchedule)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(8, 30))
                .maxCapacity(5)
                .currentBookings(2)
                .build();
    }

    @Test
    @DisplayName("Đặt lịch khám thành công - tăng currentBookings, cấp STT và mã BK...")
    void testCreateBookingSuccess() {
        BookingCreateRequest request = new BookingCreateRequest(patientProfileId, timeSlotId, "Đau thắt ngực khó thở");

        when(patientProfileRepository.findByPatientProfileIdAndAccount_UserIdAndDeletedFalse(patientProfileId, accountId))
                .thenReturn(Optional.of(testProfile));
        when(timeSlotRepository.findByIdWithLock(timeSlotId))
                .thenReturn(Optional.of(testSlot));
        when(bookingRepository.countBookingsByDoctorAndDate(doctorId, testSchedule.getScheduleDate()))
                .thenReturn(5); // Đã có 5 người đặt trước -> STT tiếp theo là 6
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setBookingId(UUID.randomUUID());
            return b;
        });

        BookingResponse response = bookingService.createBooking(accountId, request);

        assertNotNull(response);
        assertTrue(response.bookingCode().startsWith("BK"));
        assertEquals(6, response.queueNumber());
        assertEquals(3, testSlot.getCurrentBookings()); // tăng từ 2 lên 3
        assertEquals(BigDecimal.valueOf(180000), response.price());
        assertEquals(BookingStatus.PENDING_PAYMENT, response.status());
        assertEquals("Nguyen Van Benh Nhan", response.patientName());
        assertEquals("BS. Le Van B", response.doctorName());
        assertEquals("Khoa Tim Mach", response.departmentName());
        assertEquals("Phòng Khám 102", response.roomName());
        assertEquals("Đau thắt ngực khó thở", response.symptoms());

        verify(timeSlotRepository).save(testSlot);
        verify(bookingRepository).save(any(Booking.class));
    }

    @Test
    @DisplayName("Đặt lịch khám thất bại khi khung giờ đã đầy (maxCapacity)")
    void testCreateBookingSlotFull() {
        testSlot.setCurrentBookings(5); // maxCapacity is 5

        BookingCreateRequest request = new BookingCreateRequest(patientProfileId, timeSlotId, "Đau thắt ngực");

        when(patientProfileRepository.findByPatientProfileIdAndAccount_UserIdAndDeletedFalse(patientProfileId, accountId))
                .thenReturn(Optional.of(testProfile));
        when(timeSlotRepository.findByIdWithLock(timeSlotId))
                .thenReturn(Optional.of(testSlot));

        AppException ex = assertThrows(AppException.class, () -> bookingService.createBooking(accountId, request));

        assertEquals("Khung giờ khám này đã kín chỗ hoặc đang có người giữ chỗ, vui lòng chọn khung giờ khác", ex.getMessage());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("Đặt lịch khám thất bại khi hồ sơ bệnh nhân không thuộc tài khoản hiện tại")
    void testCreateBookingPatientProfileNotFound() {
        BookingCreateRequest request = new BookingCreateRequest(patientProfileId, timeSlotId, "Đau ngực");

        when(patientProfileRepository.findByPatientProfileIdAndAccount_UserIdAndDeletedFalse(patientProfileId, accountId))
                .thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> bookingService.createBooking(accountId, request));

        assertEquals("Không tìm thấy hồ sơ bệnh nhân này", ex.getMessage());
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    @Test
    @DisplayName("Kiosk booking rejects a missing schedule without saving a booking or reserving a slot")
    void testKioskBookingMissingSchedule() {
        prepareKioskPatient();
        when(scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(
                1, LocalDate.of(2026, 10, 23))).thenReturn(List.of());

        AppException ex = assertThrows(AppException.class, () -> bookingService.createKioskBooking(
                new com.hospital.api.dto.request.KioskBookingRequest("Patient", "0987654321", 1, 1980, false, null, null)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(bookingRepository, never()).save(any(Booking.class));
        verify(timeSlotRepository, never()).save(any(TimeSlot.class));
    }

    @Test
    @DisplayName("Kiosk booking rejects a full slot without saving a booking or incrementing capacity")
    void testKioskBookingFullSlot() {
        prepareKioskPatient();
        DoctorSchedule schedule = kioskSchedule();
        TimeSlot fullSlot = kioskSlot(schedule);
        fullSlot.setCurrentBookings(5);
        fullSlot.setMaxCapacity(5);
        when(scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(
                1, LocalDate.of(2026, 10, 23))).thenReturn(List.of(schedule));
        when(timeSlotRepository.findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(
                schedule.getDoctorScheduleId())).thenReturn(List.of(fullSlot));
        when(timeSlotRepository.findByIdWithLock(fullSlot.getTimeSlotId())).thenReturn(Optional.of(fullSlot));

        AppException ex = assertThrows(AppException.class, () -> bookingService.createKioskBooking(
                new com.hospital.api.dto.request.KioskBookingRequest("Patient", "0987654321", 1, 1980, false, null, null)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals(5, fullSlot.getCurrentBookings());
        verify(bookingRepository, never()).save(any(Booking.class));
        verify(timeSlotRepository, never()).save(any(TimeSlot.class));
    }

    @Test
    @DisplayName("Kiosk priority threshold treats age 64 as regular and age 65 as priority")
    void testKioskAgePriorityBoundary() {
        BookingResponse age64 = createKioskBookingForBirthYear(1962);
        BookingResponse age65 = createKioskBookingForBirthYear(1961);

        assertFalse(age64.isPriority());
        assertTrue(age65.isPriority());
    }

    @Test
    @DisplayName("Repeated check-in by booking code returns the persisted timestamp and queue number")
    void repeatedCheckInByCodeIsIdempotent() {
        LocalDateTime checkedInAt = LocalDateTime.of(2026, 10, 23, 9, 5);
        Booking booking = checkedInBooking(checkedInAt);
        when(bookingRepository.findByBookingCodeForUpdate("BK-CHECKED"))
                .thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);

        var response = bookingService.checkInKiosk(new KioskCheckInRequest("BK-CHECKED"));

        assertEquals(4, response.queueNumber());
        assertEquals(checkedInAt, response.checkedInAt());
        verify(bookingRepository, never()).countBookingsByDoctorAndDate(any(), any());
    }

    @Test
    @DisplayName("Repeated check-in by phone resolves the booking and preserves its queue")
    void repeatedCheckInByPhoneIsIdempotent() {
        LocalDateTime checkedInAt = LocalDateTime.of(2026, 10, 23, 9, 5);
        Booking booking = checkedInBooking(checkedInAt);
        when(bookingRepository.findByBookingCodeForUpdate("0987654321"))
                .thenReturn(Optional.empty());
        when(bookingRepository.findAllByPatientProfile_PhoneNumberAndBookingDateAndDeletedFalse(
                "0987654321", LocalDate.of(2026, 10, 23))).thenReturn(List.of(booking));
        when(bookingRepository.findByBookingCodeForUpdate("BK-CHECKED"))
                .thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);

        var response = bookingService.checkInKiosk(new KioskCheckInRequest("0987654321"));

        assertEquals(4, response.queueNumber());
        assertEquals(checkedInAt, response.checkedInAt());
        verify(bookingRepository, never()).countBookingsByDoctorAndDate(any(), any());
    }

    @Test
    @DisplayName("Rescheduling rejects a full target slot without changing the booking or capacity")
    void rescheduleRejectsFullTargetSlot() {
        Booking booking = Booking.builder()
                .bookingCode("BK-ACTIVE")
                .queueNumber(2)
                .bookingDate(LocalDate.of(2026, 10, 24))
                .price(BigDecimal.valueOf(180000))
                .status(BookingStatus.CONFIRMED)
                .patientProfile(testProfile)
                .timeSlot(testSlot)
                .doctor(testDoctor)
                .isPriority(false)
                .build();
        TimeSlot fullTarget = kioskSlot(kioskSchedule());
        fullTarget.setCurrentBookings(5);
        fullTarget.setMaxCapacity(5);
        when(bookingRepository.findByIdWithLock(any())).thenReturn(Optional.of(booking));
        when(timeSlotRepository.findByIdWithLock(fullTarget.getTimeSlotId())).thenReturn(Optional.of(fullTarget));

        AppException ex = assertThrows(AppException.class, () -> bookingService.rescheduleBooking(
                UUID.randomUUID(), new AdminBookingRescheduleRequest(fullTarget.getTimeSlotId())));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(bookingRepository, never()).save(any(Booking.class));
        verify(timeSlotRepository, never()).save(any(TimeSlot.class));
    }

    @Test
    @DisplayName("Rescheduling rejects a terminal booking before reading a target slot")
    void rescheduleRejectsCompletedBooking() {
        Booking booking = Booking.builder()
                .bookingCode("BK-DONE")
                .queueNumber(2)
                .bookingDate(LocalDate.of(2026, 10, 24))
                .price(BigDecimal.valueOf(180000))
                .status(BookingStatus.COMPLETED)
                .patientProfile(testProfile)
                .timeSlot(testSlot)
                .doctor(testDoctor)
                .isPriority(false)
                .build();
        when(bookingRepository.findByIdWithLock(any())).thenReturn(Optional.of(booking));

        AppException ex = assertThrows(AppException.class, () -> bookingService.rescheduleBooking(
                UUID.randomUUID(), new AdminBookingRescheduleRequest(UUID.randomUUID())));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(timeSlotRepository, never()).findByIdWithLock(any());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("Booking administration and legacy cancellation require the ADMIN role")
    void bookingAdministrationRequiresAdmin() throws NoSuchMethodException {
        assertEquals("hasRole('ADMIN')", AdminBookingController.class.getAnnotation(PreAuthorize.class).value());
        PreAuthorize cancelAuthorization = BookingController.class
                .getMethod("cancelBooking", com.hospital.api.security.UserPrincipal.class, UUID.class,
                        jakarta.servlet.http.HttpServletRequest.class)
                .getAnnotation(PreAuthorize.class);
        assertNotNull(cancelAuthorization);
        assertEquals("hasRole('ADMIN')", cancelAuthorization.value());
    }

    private BookingResponse createKioskBookingForBirthYear(int birthYear) {
        prepareKioskPatient();
        DoctorSchedule schedule = kioskSchedule();
        TimeSlot slot = kioskSlot(schedule);
        when(scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(
                1, LocalDate.of(2026, 10, 23))).thenReturn(List.of(schedule));
        when(timeSlotRepository.findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(
                schedule.getDoctorScheduleId())).thenReturn(List.of(slot));
        when(timeSlotRepository.findByIdWithLock(slot.getTimeSlotId())).thenReturn(Optional.of(slot));
        when(bookingRepository.countBookingsByDoctorAndDate(doctorId, LocalDate.of(2026, 10, 23))).thenReturn(0);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        return bookingService.createKioskBooking(new com.hospital.api.dto.request.KioskBookingRequest(
                "Patient", "0987654321", 1, birthYear, false, null, null));
    }

    private void prepareKioskPatient() {
        Account patientAccount = testProfile.getAccount();
        when(accountRepository.findByPhoneNumber("0987654321")).thenReturn(Optional.of(patientAccount));
        when(patientProfileRepository.findAllByAccount_UserIdAndDeletedFalse(accountId)).thenReturn(List.of(testProfile));
    }

    private DoctorSchedule kioskSchedule() {
        Department department = testDoctor.getDepartment();
        Room room = Room.builder().roomId(102).roomName("Room").department(department).build();
        return DoctorSchedule.builder()
                .doctorScheduleId(UUID.randomUUID())
                .doctor(testDoctor)
                .room(room)
                .scheduleDate(LocalDate.of(2026, 10, 23))
                .session(ScheduleSession.MORNING)
                .build();
    }

    private TimeSlot kioskSlot(DoctorSchedule schedule) {
        return TimeSlot.builder()
                .timeSlotId(UUID.randomUUID())
                .doctorSchedule(schedule)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(10, 30))
                .currentBookings(0)
                .holdingCount(0)
                .maxCapacity(5)
                .build();
    }

    private Booking checkedInBooking(LocalDateTime checkedInAt) {
        return Booking.builder()
                .bookingCode("BK-CHECKED")
                .queueNumber(4)
                .bookingDate(LocalDate.of(2026, 10, 23))
                .price(BigDecimal.valueOf(180000))
                .status(BookingStatus.CONFIRMED)
                .patientProfile(testProfile)
                .timeSlot(testSlot)
                .doctor(testDoctor)
                .isPriority(false)
                .checkedInAt(checkedInAt)
                .build();
    }
}
