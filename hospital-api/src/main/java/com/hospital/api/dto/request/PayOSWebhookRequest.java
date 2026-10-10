package com.hospital.api.dto.request;

import java.math.BigDecimal;

public record PayOSWebhookRequest(
        String code,
        String desc,
        PayOSWebhookData data,
        String signature
) {
    public record PayOSWebhookData(
            Long orderCode,
            BigDecimal amount,
            String description,
            String accountNumber,
            String reference,
            String transactionDateTime,
            String currency,
            String paymentLinkId,
            String code,
            String desc
    ) {}
}
