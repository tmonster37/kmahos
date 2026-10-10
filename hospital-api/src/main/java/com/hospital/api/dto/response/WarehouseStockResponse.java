package com.hospital.api.dto.response;

import com.hospital.api.entity.WarehouseStock;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record WarehouseStockResponse(
        UUID stockId,
        UUID warehouseId,
        String warehouseName,
        Integer medicineId,
        String medicineName,
        String unit,
        UUID batchId,
        String batchNumber,
        LocalDate expiryDate,
        BigDecimal unitPrice,
        Integer quantityOnHand,
        Integer quantityReserved,
        Integer quantityAvailable,
        Integer minimumThreshold
) {
    public static WarehouseStockResponse fromEntity(WarehouseStock s) {
        var m = s.getMedicine();
        var b = s.getBatch();
        var w = s.getWarehouse();
        return new WarehouseStockResponse(
                s.getStockId(),
                w != null ? w.getWarehouseId() : null,
                w != null ? w.getWarehouseName() : null,
                m != null ? m.getMedicineId() : null,
                m != null ? m.getMedicineName() : null,
                m != null && m.getUnit() != null ? m.getUnit().name() : null,
                b != null ? b.getBatchId() : null,
                b != null ? b.getBatchNumber() : null,
                b != null ? b.getExpiryDate() : null,
                b != null ? b.getUnitPrice() : null,
                s.getQuantityOnHand(),
                s.getQuantityReserved(),
                s.getAvailableQuantity(),
                s.getMinimumThreshold()
        );
    }
}
