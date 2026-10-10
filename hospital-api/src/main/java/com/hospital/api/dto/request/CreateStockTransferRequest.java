package com.hospital.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record CreateStockTransferRequest(
        @NotNull(message = "Kho xuất không được để trống")
        UUID fromWarehouseId,

        @NotNull(message = "Kho nhận không được để trống")
        UUID toWarehouseId,

        String reason,

        @NotEmpty(message = "Danh sách thuốc điều chuyển không được để trống")
        @Valid
        List<StockTransferItemRequest> items
) {}
