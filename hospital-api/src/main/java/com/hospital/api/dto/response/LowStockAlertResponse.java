package com.hospital.api.dto.response;

import com.hospital.api.entity.WarehouseStock;

import java.util.UUID;

public record LowStockAlertResponse(
        UUID stockId,
        UUID warehouseId,
        String warehouseName,
        Integer medicineId,
        String medicineName,
        String unit,
        String batchNumber,
        Integer quantityOnHand,
        Integer minimumThreshold,
        Integer deficit // Số lượng thiếu hụt so với ngưỡng an toàn
) {
    public static LowStockAlertResponse fromEntity(WarehouseStock s) {
        int deficit = Math.max(0, s.getMinimumThreshold() - s.getQuantityOnHand());
        var m = s.getMedicine();
        var w = s.getWarehouse();
        var b = s.getBatch();
        return new LowStockAlertResponse(
                s.getStockId(),
                w != null ? w.getWarehouseId() : null,
                w != null ? w.getWarehouseName() : null,
                m != null ? m.getMedicineId() : null,
                m != null ? m.getMedicineName() : null,
                m != null && m.getUnit() != null ? m.getUnit().name() : null,
                b != null ? b.getBatchNumber() : null,
                s.getQuantityOnHand(),
                s.getMinimumThreshold(),
                deficit
        );
    }
}
