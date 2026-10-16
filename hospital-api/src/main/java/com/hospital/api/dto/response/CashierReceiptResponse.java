package com.hospital.api.dto.response;

import com.hospital.api.constant.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record CashierReceiptResponse(
        String receiptCode,
        String billId,
        String bookingCode,
        UUID transactionId,
        String patientName,
        String phoneNumber,
        String identityNumber,
        String departmentName,
        String doctorName,
        List<CashierBillItemDto> items,
        BigDecimal totalAmount,
        PaymentMethod paymentMethod,
        BigDecimal amountGiven,
        BigDecimal amountChange,
        String status, // SUCCESS
        LocalDateTime paidAt,
        String cashierName,
        String notes
) {}
