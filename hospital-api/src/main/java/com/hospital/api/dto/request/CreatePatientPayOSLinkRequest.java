package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreatePatientPayOSLinkRequest(
        @NotBlank(message = "Mã hóa đơn (billId) không được để trống")
        String billId
) {}

