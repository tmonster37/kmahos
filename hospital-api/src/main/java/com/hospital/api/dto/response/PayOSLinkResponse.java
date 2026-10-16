package com.hospital.api.dto.response;

public record PayOSLinkResponse(
        Long orderCode,
        String paymentLinkId,
        String checkoutUrl,
        String qrCode,
        String status,
        Long amount,
        String description,
        String accountNumber,
        String accountName,
        String bin
) {}
