package com.hospital.api.service;

import com.hospital.api.dto.request.CreateScheduleRequest;
import com.hospital.api.dto.request.UpdateScheduleRequest;
import com.hospital.api.dto.response.ScheduleResponse;
import com.hospital.api.security.UserPrincipal;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ScheduleService {
    ScheduleResponse createSchedule(CreateScheduleRequest request);
    ScheduleResponse createSchedule(CreateScheduleRequest request, UserPrincipal currentUser);
    ScheduleResponse updateSchedule(UUID scheduleId, UpdateScheduleRequest request);
    ScheduleResponse updateSchedule(UUID scheduleId, UpdateScheduleRequest request, UserPrincipal currentUser);
    List<ScheduleResponse> getSchedulesByDepartmentAndDate(Integer departmentId, LocalDate date);
    List<ScheduleResponse> getDoctorSchedules(UUID doctorId);
    List<ScheduleResponse> getAllSchedules(LocalDate date);
    List<ScheduleResponse> getAllSchedules(LocalDate date, UserPrincipal currentUser);
    List<ScheduleResponse> getSchedules(LocalDate startDate, LocalDate endDate, UUID doctorId, Integer departmentId);
    List<ScheduleResponse> getSchedules(LocalDate startDate, LocalDate endDate, UUID doctorId, Integer departmentId, UserPrincipal currentUser);
    void deleteSchedule(UUID scheduleId);
    void deleteSchedule(UUID scheduleId, UserPrincipal currentUser);
}
