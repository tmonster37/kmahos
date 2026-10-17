package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.response.RevenueKpiResponse;
import com.hospital.api.dto.response.RoomCapacityKpiResponse;
import com.hospital.api.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    /**
     * KPI Doanh thu tổng hợp theo phương thức thanh toán và biểu đồ 7 ngày (Chỉ ADMIN)
     */
    @GetMapping({"/kpi-revenue", "/revenue"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<RevenueKpiResponse>> getRevenueKpi(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        RevenueKpiResponse response = adminDashboardService.getRevenueKpi(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.ok(response, "Lấy dữ liệu KPI doanh thu thành công"));
    }

    /**
     * KPI Công suất sử dụng buồng khám thời gian thực (ADMIN & Trưởng khoa)
     */
    @GetMapping({"/room-capacity", "/capacity"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<RoomCapacityKpiResponse>> getRoomCapacityKpi(
            @RequestParam(required = false) Integer departmentId
    ) {
        RoomCapacityKpiResponse response = adminDashboardService.getRoomCapacityKpi(departmentId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Lấy dữ liệu công suất buồng khám thành công"));
    }
}
