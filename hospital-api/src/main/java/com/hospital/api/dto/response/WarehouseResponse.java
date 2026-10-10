package com.hospital.api.dto.response;

import com.hospital.api.constant.WarehouseType;
import com.hospital.api.entity.PharmacyWarehouse;

import java.util.UUID;

public record WarehouseResponse(
        UUID warehouseId,
        String warehouseCode,
        String warehouseName,
        WarehouseType warehouseType,
        String location,
        Integer departmentId,
        String departmentName,
        UUID managerStaffId,
        String managerStaffName,
        Boolean isActive
) {
    public static WarehouseResponse fromEntity(PharmacyWarehouse w) {
        return new WarehouseResponse(
                w.getWarehouseId(),
                w.getWarehouseCode(),
                w.getWarehouseName(),
                w.getWarehouseType(),
                w.getLocation(),
                w.getDepartment() != null ? w.getDepartment().getDepartmentId() : null,
                w.getDepartment() != null ? w.getDepartment().getDepartmentName() : null,
                w.getManagerStaff() != null ? w.getManagerStaff().getStaffId() : null,
                w.getManagerStaff() != null ? w.getManagerStaff().getFullName() : null,
                w.getIsActive()
        );
    }
}
