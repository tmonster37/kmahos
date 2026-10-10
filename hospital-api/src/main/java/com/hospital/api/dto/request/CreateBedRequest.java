package com.hospital.api.dto.request;

import com.hospital.api.constant.BedStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateBedRequest(
        @NotNull(message = "ID phòng không được để trống")
        Integer roomId,

        @NotBlank(message = "Số giường không được để trống")
        String bedNumber,

        BedStatus status,
        String notes
) {}
