package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record BedTransferRequest(
        @NotNull(message = "Giường đích không được để trống")
        UUID targetBedId,

        @NotBlank(message = "Lý do chuyển giường không được để trống")
        String transferReason,

        UUID doctorId
) {}
