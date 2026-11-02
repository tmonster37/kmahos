package com.hospital.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record MedicalServiceRequest(
        @NotBlank(message = "Tên dịch vụ kỹ thuật không được để trống")
        String serviceName,

        @NotNull(message = "Đơn giá không được để trống")
        @DecimalMin(value = "0.0", inclusive = false, message = "Đơn giá phải lớn hơn 0")
        BigDecimal price,

        @NotNull(message = "Chuyên khoa phụ trách không được để trống")
        Integer departmentId,

        String description
) {}

