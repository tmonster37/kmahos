package com.hospital.api.service;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.Degree;
import com.hospital.api.constant.Role;
import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.dto.request.BookingCreateRequest;
import com.hospital.api.dto.response.BookingResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.PatientProfileRepository;
import com.hospital.api.repository.TimeSlotRepository;
import com.hospital.api.service.impl.BookingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
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

    @InjectMocks
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
        assertEquals(BookingStatus.CONFIRMED, response.status());
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

        assertEquals("Khung giờ khám này đã kín chỗ, vui lòng chọn khung giờ khác", ex.getMessage());
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
}
