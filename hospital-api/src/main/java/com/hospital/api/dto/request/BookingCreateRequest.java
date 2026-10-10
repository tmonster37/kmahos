package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record BookingCreateRequest(
        @NotNull(message = "Hồ sơ bệnh nhân không được để trống")
        UUID patientProfileId,

        @NotNull(message = "Khung giờ khám không được để trống")
        UUID timeSlotId,

        @NotBlank(message = "Vui lòng mô tả triệu chứng ban đầu")
        String symptoms
) {}

