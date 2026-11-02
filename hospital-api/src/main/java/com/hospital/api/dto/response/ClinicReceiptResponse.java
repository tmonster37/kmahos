package com.hospital.api.dto.response;

import java.math.BigDecimal;

public record ClinicReceiptResponse(
        String receiptCode,
        String bookingCode,
        String patientName,
        String phoneNumber,
        String departmentName,
        String doctorName,
        BigDecimal consultationFee,
        BigDecimal paidAmount,
        String paymentMethod,
        String cashierName,
        String paidAt,
        String message,
        String receptionSource
) {
    public ClinicReceiptResponse(
            String receiptCode, String bookingCode, String patientName, String phoneNumber,
            String departmentName, String doctorName, BigDecimal consultationFee,
            BigDecimal paidAmount, String paymentMethod, String cashierName, String paidAt,
            String message
    ) {
        this(receiptCode, bookingCode, patientName, phoneNumber, departmentName, doctorName,
                consultationFee, paidAmount, paymentMethod, cashierName, paidAt, message,
                "ONLINE_APPOINTMENT");
    }
}
