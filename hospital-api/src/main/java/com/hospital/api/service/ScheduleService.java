package com.hospital.api.service;

import com.hospital.api.dto.request.CreateScheduleRequest;
import com.hospital.api.dto.response.ScheduleResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ScheduleService {
    ScheduleResponse createSchedule(CreateScheduleRequest request);
    List<ScheduleResponse> getSchedulesByDepartmentAndDate(Integer departmentId, LocalDate date);
    List<ScheduleResponse> getDoctorSchedules(UUID doctorId);
    List<ScheduleResponse> getAllSchedules(LocalDate date);
    List<ScheduleResponse> getSchedules(LocalDate startDate, LocalDate endDate, UUID doctorId, Integer departmentId);
    void deleteSchedule(UUID scheduleId);
}
