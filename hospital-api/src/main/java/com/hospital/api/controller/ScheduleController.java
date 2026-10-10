package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.CreateScheduleRequest;
import com.hospital.api.dto.response.ScheduleResponse;
import com.hospital.api.service.ScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    // Tạo lịch trực cho bác sĩ (Admin hoặc Trưởng khoa)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<ScheduleResponse>> createSchedule(@Valid @RequestBody CreateScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(scheduleService.createSchedule(request), "Tạo lịch trực thành công"));
    }

    // Tra cứu danh sách lịch trực linh hoạt (cho bác sĩ hoặc lọc theo khoảng ngày)
    @GetMapping
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> getSchedules(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) UUID doctorId,
            @RequestParam(required = false) Integer departmentId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                scheduleService.getSchedules(startDate, endDate, doctorId, departmentId),
                "Lấy danh sách ca trực thành công"
        ));
    }

    // Tra cứu lịch trực theo khoa và ngày (Công khai cho bệnh nhân chọn lịch khám)
    @GetMapping("/by-department")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> getSchedulesByDepartment(
            @RequestParam Integer departmentId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                scheduleService.getSchedulesByDepartmentAndDate(departmentId, date),
                "Lấy danh sách lịch trực thành công"
        ));
    }

    // Xem lịch trực của một bác sĩ cụ thể
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> getDoctorSchedules(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getDoctorSchedules(doctorId), "Lấy lịch trực bác sĩ thành công"));
    }

    // Xem toàn bộ lịch trực (Quản trị viên)
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> getAllSchedules(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getAllSchedules(date), "Lấy danh sách tất cả ca trực thành công"));
    }

    // Xóa/Hủy ca trực
    @DeleteMapping("/{scheduleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable UUID scheduleId) {
        scheduleService.deleteSchedule(scheduleId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xóa ca trực thành công"));
    }
}

