package com.hospital.api.dto.response;

import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.entity.DoctorSchedule;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ScheduleResponse(
        UUID scheduleId,
        UUID doctorId,
        String doctorName,
        String degree,
        String departmentName,
        Integer roomId,
        String roomName,
        LocalDate scheduleDate,
        ScheduleSession session,
        List<TimeSlotResponse> timeSlots
) {
    public static ScheduleResponse fromEntity(DoctorSchedule ds) {
        return new ScheduleResponse(
                ds.getDoctorScheduleId(),
                ds.getDoctor() != null ? ds.getDoctor().getDoctorId() : null,
                (ds.getDoctor() != null && ds.getDoctor().getAccount() != null) ? ds.getDoctor().getAccount().getFullName() : null,
                (ds.getDoctor() != null && ds.getDoctor().getDegree() != null) ? ds.getDoctor().getDegree().name() : null,
                (ds.getDoctor() != null && ds.getDoctor().getDepartment() != null) ? ds.getDoctor().getDepartment().getDepartmentName() : null,
                ds.getRoom() != null ? ds.getRoom().getRoomId() : null,
                ds.getRoom() != null ? ds.getRoom().getRoomName() : null,
                ds.getScheduleDate(),
                ds.getSession(),
                ds.getTimeSlots() != null ? ds.getTimeSlots().stream().map(TimeSlotResponse::fromEntity).toList() : List.of()
        );
    }
}

