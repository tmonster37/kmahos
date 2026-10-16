package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record PayAtClinicRequest(
        @NotNull(message = "bookingId không được để trống")
        UUID bookingId,
        BigDecimal amount,
        String paymentMethod,
        String cashierNotes
) {}
