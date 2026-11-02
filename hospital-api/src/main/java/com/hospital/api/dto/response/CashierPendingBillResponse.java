package com.hospital.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record CashierPendingBillResponse(
        String billId,
        String bookingCode,
        UUID bookingId,
        String patientName,
        String phoneNumber,
        String identityNumber,
        String gender,
        String address,
        String departmentName,
        String doctorName,
        String billType, // EXAM_AND_TESTS, PRESCRIPTION, ALL
        List<CashierBillItemDto> items,
        BigDecimal totalAmount,
        String status, // UNPAID
        LocalDateTime createdAt,
        String receptionSource
) {
    public CashierPendingBillResponse(
            String billId, String bookingCode, UUID bookingId, String patientName,
            String phoneNumber, String identityNumber, String gender, String address,
            String departmentName, String doctorName, String billType,
            List<CashierBillItemDto> items, BigDecimal totalAmount, String status,
            LocalDateTime createdAt
    ) {
        this(billId, bookingCode, bookingId, patientName, phoneNumber, identityNumber,
                gender, address, departmentName, doctorName, billType, items, totalAmount,
                status, createdAt, "ONLINE_APPOINTMENT");
    }
}
