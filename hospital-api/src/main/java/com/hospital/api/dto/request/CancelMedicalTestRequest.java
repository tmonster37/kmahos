package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CancelMedicalTestRequest(
        @NotBlank(message = "Lý do hủy chỉ định xét nghiệm không được để trống")
        String cancelReason
) {}
