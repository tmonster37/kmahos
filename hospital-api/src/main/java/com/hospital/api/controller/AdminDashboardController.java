package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.response.RevenueKpiResponse;
import com.hospital.api.dto.response.RoomCapacityKpiResponse;
import com.hospital.api.entity.Doctor;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;
    private final DoctorRepository doctorRepository;

    /**
     * KPI Doanh thu tổng hợp theo phương thức thanh toán và biểu đồ 7 ngày (Chỉ ADMIN)
     */
    @GetMapping({"/kpi-revenue", "/revenue"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RevenueKpiResponse>> getRevenueKpi(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        RevenueKpiResponse response = adminDashboardService.getRevenueKpi(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.ok(response, "Lấy dữ liệu KPI doanh thu thành công"));
    }

    /**
     * KPI Công suất sử dụng buồng khám thời gian thực (ADMIN & Trưởng khoa)
     * Trưởng khoa bị giới hạn nghiêm ngặt trong chuyên khoa của mình.
     */
    @GetMapping({"/room-capacity", "/capacity"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<RoomCapacityKpiResponse>> getRoomCapacityKpi(
            @RequestParam(required = false) Integer departmentId,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        Integer effectiveDeptId = departmentId;
        if (currentUser != null && currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HEAD_OF_DEPARTMENT"))) {
            boolean isAdmin = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                Doctor headDoc = doctorRepository.findByAccount_UserId(currentUser.getId())
                        .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin trưởng khoa", HttpStatus.FORBIDDEN));
                if (headDoc.getDepartment() == null) {
                    throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
                }
                effectiveDeptId = headDoc.getDepartment().getDepartmentId();
            }
        }
        RoomCapacityKpiResponse response = adminDashboardService.getRoomCapacityKpi(effectiveDeptId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Lấy dữ liệu công suất buồng khám thành công"));
    }
}
