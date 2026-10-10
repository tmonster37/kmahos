package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record LisMachineResultItemDto(
        @NotBlank(message = "Mã chỉ số không được để trống")
        String parameterCode,

        @NotBlank(message = "Tên chỉ số không được để trống")
        String parameterName,

        BigDecimal valueNumeric,

        String valueText,

        String unit,

        String referenceRange,

        String machineFlag // Cờ từ máy: N (Normal), H (High), L (Low), C (Critical)
) {}
