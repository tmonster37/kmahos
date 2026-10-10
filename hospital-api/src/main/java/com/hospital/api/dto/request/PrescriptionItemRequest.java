package com.hospital.api.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PrescriptionItemRequest(
        @NotNull(message = "Mã thuốc không được để trống")
        Integer medicineId,

        @NotNull(message = "Số lượng thuốc không được để trống")
        @Min(value = 1, message = "Số lượng thuốc tối thiểu là 1")
        Integer quantity,

        Float morningAmount,
        Float noonAmount,
        Float afternoonAmount,
        Float eveningAmount,
        @JsonAlias({"dosage", "usageInstruction", "instruction"})
        String dosageInstruction
) {}

