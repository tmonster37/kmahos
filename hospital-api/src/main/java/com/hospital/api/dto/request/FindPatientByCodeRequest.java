package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record FindPatientByCodeRequest(
        @NotBlank(message = "Mã bệnh nhân không được để trống")
        String patientCode
) {
}
