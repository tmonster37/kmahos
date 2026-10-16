package com.hospital.api.dto.response;

import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentGatewayResponse(
        UUID transactionId,
        String txnRef,
        PaymentMethod paymentMethod,
        TransactionType transactionType,
        BigDecimal amount,
        String status,
        String qrImageUrl,
        String paymentUrl,
        String deeplink,
        String bankName,
        String bankAccountNo,
        String accountHolder,
        String transferContent,
        String description,
        Long orderCode
) {}
