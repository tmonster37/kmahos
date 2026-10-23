package com.hospital.api.dto.request;

import com.hospital.api.constant.TransactionType;
import java.math.BigDecimal;

public record CreatePayOSLinkRequest(
        BigDecimal amount,
        TransactionType type,
        String description
) {}
