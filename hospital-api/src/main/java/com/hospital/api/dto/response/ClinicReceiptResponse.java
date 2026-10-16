package com.hospital.api.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

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
        String message
) {}
