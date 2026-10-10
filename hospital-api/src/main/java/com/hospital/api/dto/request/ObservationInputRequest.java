package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record ObservationInputRequest(
        @NotBlank(message = "Mã chỉ số không được để trống")
        String conceptCode,

        BigDecimal valueNumeric,
        String valueText,
        Boolean valueBoolean,
        String comments
) {}
