package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ReserveSlotRequest(
        @NotNull(message = "timeSlotId không được để trống")
        UUID timeSlotId,
        UUID patientProfileId
) {}
