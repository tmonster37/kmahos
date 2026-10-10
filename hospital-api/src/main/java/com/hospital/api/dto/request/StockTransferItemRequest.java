package com.hospital.api.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record StockTransferItemRequest(
        @NotNull(message = "Mã thuốc không được để trống")
        Integer medicineId,

        @NotNull(message = "Lô thuốc không được để trống")
        UUID batchId,

        @NotNull(message = "Số lượng điều chuyển không được để trống")
        @Min(value = 1, message = "Số lượng điều chuyển tối thiểu là 1")
        Integer quantity,

        String notes
) {}
