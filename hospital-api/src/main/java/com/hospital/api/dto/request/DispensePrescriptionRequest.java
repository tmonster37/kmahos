package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record DispensePrescriptionRequest(
        @NotNull(message = "Kho cấp phát thuốc không được để trống")
        UUID warehouseId, // Kho ngoại trú hoặc Kho nội trú

        UUID dispenserStaffId, // Dược sĩ cấp phát

        String notes // Ghi chú cấp phát / dặn dò
) {}
