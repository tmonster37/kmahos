package com.hospital.api.dto.response;

import java.math.BigDecimal;

public record CashierBillItemDto(
        String itemId,
        String name,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        String category // EXAM, TEST, MEDICINE, INPATIENT
) {}
