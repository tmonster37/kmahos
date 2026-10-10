package com.hospital.api.service;

import com.hospital.api.constant.Degree;
import com.hospital.api.constant.Role;
import com.hospital.api.constant.RoomType;
import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.dto.request.CreateScheduleRequest;
import com.hospital.api.dto.response.ScheduleResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Department;
import com.hospital.api.entity.Doctor;
import com.hospital.api.entity.DoctorSchedule;
import com.hospital.api.entity.Room;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.DoctorScheduleRepository;
import com.hospital.api.repository.RoomRepository;
import com.hospital.api.service.impl.ScheduleServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @Mock
    private DoctorScheduleRepository scheduleRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private RoomRepository roomRepository;

    @InjectMocks
    private ScheduleServiceImpl scheduleService;

    private Doctor testDoctor;
    private Room testRoom;
    private Department testDept;
    private Account testAccount;
    private UUID doctorId;
    private Integer roomId;

    @BeforeEach
    void setUp() {
        doctorId = UUID.randomUUID();
        roomId = 1;

        testAccount = Account.builder()
                .userId(UUID.randomUUID())
                .fullName("BS. Nguyen Van A")
                .role(Role.ROLE_DOCTOR)
                .build();

        testDept = Department.builder()
                .departmentId(1)
                .departmentName("Khoa Tim Mach")
                .build();

        testDoctor = Doctor.builder()
                .doctorId(doctorId)
                .account(testAccount)
                .department(testDept)
                .degree(Degree.BSCKII)
                .consultationFee(BigDecimal.valueOf(200000))
                .build();

        testRoom = Room.builder()
                .roomId(roomId)
                .roomName("Phòng 101")
                .roomType(RoomType.EXAMINATION_ROOM)
                .department(testDept)
                .build();
    }

    @Test
    @DisplayName("Tạo lịch trực thành công - tự động sinh 8 khung giờ (30 phút/slot) cho ca sáng")
    void testCreateScheduleSuccess() {
        LocalDate date = LocalDate.now().plusDays(2);
        CreateScheduleRequest request = new CreateScheduleRequest(doctorId, roomId, date, ScheduleSession.MORNING);

        when(scheduleRepository.existsByDoctor_DoctorIdAndScheduleDateAndSessionAndDeletedFalse(doctorId, date, ScheduleSession.MORNING))
                .thenReturn(false);
        when(doctorRepository.findById(doctorId)).thenReturn(Optional.of(testDoctor));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(testRoom));
        when(scheduleRepository.save(any(DoctorSchedule.class))).thenAnswer(invocation -> {
            DoctorSchedule ds = invocation.getArgument(0);
            ds.setDoctorScheduleId(UUID.randomUUID());
            return ds;
        });

        ScheduleResponse response = scheduleService.createSchedule(request);

        assertNotNull(response);
        assertEquals(doctorId, response.doctorId());
        assertEquals("BS. Nguyen Van A", response.doctorName());
        assertEquals("BSCKII", response.degree());
        assertEquals(roomId, response.roomId());
        assertEquals("Phòng 101", response.roomName());
        assertEquals(date, response.scheduleDate());
        assertEquals(ScheduleSession.MORNING, response.session());
        // Ca sáng từ 07:30 đến 11:30 có 8 slots: 07:30, 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00
        assertEquals(8, response.timeSlots().size());
        assertEquals(LocalTime.of(7, 30), response.timeSlots().get(0).startTime());
        assertEquals(LocalTime.of(8, 0), response.timeSlots().get(0).endTime());
        assertEquals(5, response.timeSlots().get(0).maxCapacity());
        assertEquals(0, response.timeSlots().get(0).currentBookings());
        assertFalse(response.timeSlots().get(0).isFull());
    }

    @Test
    @DisplayName("Tạo lịch trực thất bại khi ca trực đã tồn tại")
    void testCreateScheduleDuplicateSession() {
        LocalDate date = LocalDate.now().plusDays(2);
        CreateScheduleRequest request = new CreateScheduleRequest(doctorId, roomId, date, ScheduleSession.MORNING);

        when(scheduleRepository.existsByDoctor_DoctorIdAndScheduleDateAndSessionAndDeletedFalse(doctorId, date, ScheduleSession.MORNING))
                .thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> scheduleService.createSchedule(request));
        assertEquals("Bác sĩ đã có lịch trực trong ca này", ex.getMessage());
    }

    @Test
    @DisplayName("Tra cứu lịch trực theo khoa và ngày")
    void testGetSchedulesByDepartmentAndDate() {
        LocalDate date = LocalDate.now().plusDays(1);
        DoctorSchedule schedule = DoctorSchedule.builder()
                .doctorScheduleId(UUID.randomUUID())
                .doctor(testDoctor)
                .room(testRoom)
                .scheduleDate(date)
                .session(ScheduleSession.AFTERNOON)
                .build();

        when(scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(1, date))
                .thenReturn(List.of(schedule));

        List<ScheduleResponse> results = scheduleService.getSchedulesByDepartmentAndDate(1, date);

        assertEquals(1, results.size());
        assertEquals(ScheduleSession.AFTERNOON, results.get(0).session());
        assertEquals("BS. Nguyen Van A", results.get(0).doctorName());
    }
}
