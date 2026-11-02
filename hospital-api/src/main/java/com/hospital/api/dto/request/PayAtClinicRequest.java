package com.hospital.api.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

public record PayAtClinicRequest(
        UUID bookingId,
        String bookingCode,
        BigDecimal amount,
        String paymentMethod,
        String cashierNotes
) {
    public PayAtClinicRequest(UUID bookingId, BigDecimal amount, String paymentMethod, String cashierNotes) {
        this(bookingId, null, amount, paymentMethod, cashierNotes);
    }
}
