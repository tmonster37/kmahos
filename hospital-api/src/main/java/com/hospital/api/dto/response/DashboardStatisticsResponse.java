package com.hospital.api.dto.response;

import java.math.BigDecimal;
import java.util.Map;

public record DashboardStatisticsResponse(
        long totalPatients,             // Tổng số bệnh nhân
        long totalDoctors,              // Tổng số bác sĩ
        long totalBookingsToday,        // Số lượt đặt khám hôm nay
        long totalCompletedExams,       // Số ca khám hoàn tất
        BigDecimal totalRevenueThisMonth,// Tổng doanh thu viện phí tháng này
        Map<String, Long> bookingsByDepartment // Phân bố lượt khám theo Khoa
) {}

