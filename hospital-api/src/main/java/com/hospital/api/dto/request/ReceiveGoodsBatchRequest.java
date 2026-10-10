package com.hospital.api.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ReceiveGoodsBatchRequest(
        @NotNull(message = "Kho nhận hàng không được để trống")
        UUID warehouseId,

        @NotNull(message = "Mã thuốc không được để trống")
        Integer medicineId,

        @NotBlank(message = "Số lô sản xuất không được để trống")
        String batchNumber,

        LocalDate manufacturingDate,

        @NotNull(message = "Hạn sử dụng không được để trống")
        LocalDate expiryDate,

        @NotNull(message = "Số lượng nhập không được để trống")
        @Min(value = 1, message = "Số lượng nhập tối thiểu là 1")
        Integer quantity,

        BigDecimal purchasePrice,

        BigDecimal unitPrice,

        String manufacturer
) {}
