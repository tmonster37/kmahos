package com.hospital.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record RevenueKpiResponse(
        BigDecimal totalRevenue,
        BigDecimal cashRevenue,
        BigDecimal vietQrRevenue,
        BigDecimal momoRevenue,
        BigDecimal vnpayRevenue,
        BigDecimal posRevenue,
        long totalTransactions,
        long todayAppointments,
        long completedAppointments,
        long inProgressAppointments,
        long cancelledAppointments,
        double completionRate,
        double cancellationRate,
        List<DailyRevenueItem> dailyBreakdown
) {
    public record DailyRevenueItem(
            LocalDate date,
            BigDecimal revenue,
            long transactionCount
    ) {}
}
