package com.hospital.api.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ReserveSlotResponse(
        UUID reservationId,
        UUID timeSlotId,
        Instant expiresAt,
        long ttlSeconds,
        String message
) {}
