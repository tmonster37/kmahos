package com.hospital.api.dto.request;

import com.hospital.api.constant.WarehouseType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateWarehouseRequest(
        @NotBlank(message = "Mã kho không được để trống")
        String warehouseCode,

        @NotBlank(message = "Tên kho không được để trống")
        String warehouseName,

        @NotNull(message = "Loại kho không được để trống")
        WarehouseType warehouseType,

        String location,

        Integer departmentId,

        UUID managerStaffId
) {}
