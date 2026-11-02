package com.hospital.api.dto.request;

import com.hospital.api.constant.MedicineUnit;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record MedicineRequest(
        @NotBlank(message = "Tên thuốc không được để trống")
        String medicineName,

        String activeIngredient,

        @NotNull(message = "Đơn vị tính không được để trống")
        MedicineUnit unit,

        @NotNull(message = "Đơn giá không được để trống")
        @DecimalMin(value = "0.0", inclusive = false, message = "Đơn giá phải lớn hơn 0")
        BigDecimal price,

        Integer stockQuantity
) {}

