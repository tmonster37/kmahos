package com.hospital.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PatientPendingBillResponse(
        String billId,
        String bookingCode,
        UUID bookingId,
        String category,
        List<CashierBillItemDto> items,
        BigDecimal totalAmount,
        String reconciliationStatus,
        String status,
        LocalDateTime createdAt
) {}

