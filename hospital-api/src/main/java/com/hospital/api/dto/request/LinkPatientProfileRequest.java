package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LinkPatientProfileRequest(
        @NotNull(message = "ID hồ sơ không được để trống")
        UUID patientProfileId,

        @NotBlank(message = "Số điện thoại xác thực không được để trống")
        String verificationPhoneNumber
) {
}
