package com.hospital.api.dto.response;

import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.entity.Transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(
        UUID transactionId,
        BigDecimal amount,
        TransactionType transactionType,
        PaymentMethod paymentMethod,
        String status,
        String vnpayTxnRef,
        String description,
        Instant createdAt,
        Instant updatedAt,
        String patientName,
        String patientPhoneMasked,
        Long orderCode,
        Boolean isVerified,
        String webhookReference
) {
    public static TransactionResponse fromEntity(Transaction txn) {
        if (txn == null) return null;

        String name = "Khách hàng";
        String phoneMasked = "";

        if (txn.getAccount() != null) {
            if (txn.getAccount().getFullName() != null) {
                name = txn.getAccount().getFullName();
            }
            if (txn.getAccount().getPhoneNumber() != null) {
                phoneMasked = maskPhoneNumber(txn.getAccount().getPhoneNumber());
            }
        }

        return new TransactionResponse(
                txn.getTransactionId(),
                txn.getAmount(),
                txn.getTransactionType(),
                txn.getPaymentMethod(),
                txn.getStatus(),
                txn.getVnpayTxnRef(),
                txn.getDescription(),
                txn.getCreatedAt(),
                txn.getUpdatedAt(),
                name,
                phoneMasked,
                txn.getOrderCode(),
                Boolean.TRUE.equals(txn.getIsVerified()),
                txn.getWebhookReference()
        );
    }

    private static String maskPhoneNumber(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 3);
    }
}
