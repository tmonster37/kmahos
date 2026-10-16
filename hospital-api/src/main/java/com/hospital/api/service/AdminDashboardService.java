package com.hospital.api.service;

import com.hospital.api.dto.response.RevenueKpiResponse;
import com.hospital.api.dto.response.RoomCapacityKpiResponse;

import java.time.LocalDate;

public interface AdminDashboardService {
    RevenueKpiResponse getRevenueKpi(LocalDate startDate, LocalDate endDate);
    RoomCapacityKpiResponse getRoomCapacityKpi(Integer departmentId);
}
