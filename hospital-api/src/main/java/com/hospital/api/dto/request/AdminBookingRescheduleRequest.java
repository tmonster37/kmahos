package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AdminBookingRescheduleRequest(
        @NotNull(message = "Vui lòng chọn khung giờ mới")
        UUID timeSlotId
) {
}
