package com.hospital.api.dto.request;

import com.hospital.api.constant.ConceptDataType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateConceptRequest(
        @NotBlank(message = "Mã khái niệm không được để trống")
        String conceptCode,

        @NotBlank(message = "Tên khái niệm không được để trống")
        String name,

        @NotNull(message = "Kiểu dữ liệu không được để trống")
        ConceptDataType dataType,

        String unit,
        BigDecimal minNormal,
        BigDecimal maxNormal,
        Integer departmentId,
        String loincCode,
        String description
) {}
