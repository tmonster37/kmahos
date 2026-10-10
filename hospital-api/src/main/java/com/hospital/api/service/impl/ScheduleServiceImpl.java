package com.hospital.api.service.impl;

import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.dto.request.CreateScheduleRequest;
import com.hospital.api.dto.response.ScheduleResponse;
import com.hospital.api.entity.Doctor;
import com.hospital.api.entity.DoctorSchedule;
import com.hospital.api.entity.Room;
import com.hospital.api.entity.TimeSlot;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.DoctorScheduleRepository;
import com.hospital.api.repository.RoomRepository;
import com.hospital.api.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleService {

    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorRepository doctorRepository;
    private final RoomRepository roomRepository;

    @Override
    @Transactional
    public ScheduleResponse createSchedule(CreateScheduleRequest request) {
        if (scheduleRepository.existsByDoctor_DoctorIdAndScheduleDateAndSessionAndDeletedFalse(
                request.doctorId(), request.scheduleDate(), request.session())) {
            throw new AppException("Bác sĩ đã có lịch trực trong ca này", HttpStatus.BAD_REQUEST);
        }

        if (scheduleRepository.existsByRoom_RoomIdAndScheduleDateAndSessionAndDeletedFalse(
                request.roomId(), request.scheduleDate(), request.session())) {
            throw new AppException("Phòng khám này đã có bác sĩ khác trực trong ca này", HttpStatus.BAD_REQUEST);
        }

        Doctor doctor = doctorRepository.findById(request.doctorId())
                .orElseThrow(() -> new AppException("Không tìm thấy bác sĩ", HttpStatus.NOT_FOUND));

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() -> new AppException("Không tìm thấy phòng khám", HttpStatus.NOT_FOUND));

        DoctorSchedule schedule = DoctorSchedule.builder()
                .doctor(doctor)
                .room(room)
                .scheduleDate(request.scheduleDate())
                .session(request.session())
                .build();

        // Tự động sinh các TimeSlot (mỗi slot 30 phút)
        List<TimeSlot> slots = generateTimeSlots(schedule, request.session());
        schedule.setTimeSlots(slots);

        return ScheduleResponse.fromEntity(scheduleRepository.save(schedule));
    }

    private List<TimeSlot> generateTimeSlots(DoctorSchedule schedule, ScheduleSession session) {
        LocalTime start = switch (session) {
            case MORNING -> LocalTime.of(7, 30);
            case AFTERNOON -> LocalTime.of(13, 0);
            case EVENING -> LocalTime.of(17, 30);
        };

        LocalTime end = switch (session) {
            case MORNING -> LocalTime.of(11, 30);
            case AFTERNOON -> LocalTime.of(17, 0);
            case EVENING -> LocalTime.of(20, 30);
        };

        List<TimeSlot> timeSlots = new ArrayList<>();
        LocalTime current = start;

        while (current.isBefore(end)) {
            LocalTime next = current.plusMinutes(30);
            TimeSlot slot = TimeSlot.builder()
                    .doctorSchedule(schedule)
                    .startTime(current)
                    .endTime(next)
                    .maxCapacity(5) // Tối đa 5 lượt / slot
                    .currentBookings(0)
                    .build();
            timeSlots.add(slot);
            current = next;
        }

        return timeSlots;
    }

    @Override
    public List<ScheduleResponse> getSchedulesByDepartmentAndDate(Integer departmentId, LocalDate date) {
        return scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(departmentId, date)
                .stream()
                .map(ScheduleResponse::fromEntity)
                .toList();
    }

    @Override
    public List<ScheduleResponse> getDoctorSchedules(UUID doctorId) {
        return scheduleRepository.findAllByDoctor_DoctorIdAndScheduleDateAfterAndDeletedFalse(doctorId, LocalDate.now().minusDays(1))
                .stream()
                .map(ScheduleResponse::fromEntity)
                .toList();
    }

    @Override
    public List<ScheduleResponse> getAllSchedules(LocalDate date) {
        List<DoctorSchedule> schedules;
        if (date != null) {
            schedules = scheduleRepository.findAllByScheduleDateAndDeletedFalse(date);
        } else {
            schedules = scheduleRepository.findAllByDeletedFalse();
        }
        return schedules.stream()
                .map(ScheduleResponse::fromEntity)
                .toList();
    }

    @Override
    public List<ScheduleResponse> getSchedules(LocalDate startDate, LocalDate endDate, UUID doctorId, Integer departmentId) {
        List<DoctorSchedule> schedules;
        if (doctorId != null && startDate != null && endDate != null) {
            schedules = scheduleRepository.findAllByDoctor_DoctorIdAndScheduleDateBetweenAndDeletedFalse(doctorId, startDate, endDate);
        } else if (doctorId != null) {
            schedules = scheduleRepository.findAllByDoctor_DoctorIdAndScheduleDateAfterAndDeletedFalse(doctorId, LocalDate.now().minusDays(1));
        } else if (departmentId != null && startDate != null) {
            schedules = scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(departmentId, startDate);
        } else if (startDate != null && endDate != null) {
            schedules = scheduleRepository.findAllByScheduleDateBetweenAndDeletedFalse(startDate, endDate);
        } else if (startDate != null) {
            schedules = scheduleRepository.findAllByScheduleDateAndDeletedFalse(startDate);
        } else {
            schedules = scheduleRepository.findAllByDeletedFalse();
        }
        return schedules.stream()
                .map(ScheduleResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public void deleteSchedule(UUID scheduleId) {
        DoctorSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new AppException("Ca trực không tồn tại", HttpStatus.NOT_FOUND));
        schedule.setDeleted(true);
        scheduleRepository.save(schedule);
    }
}

