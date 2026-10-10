package com.hospital.api.dto.response;

import com.hospital.api.entity.StockTransferItem;

import java.time.LocalDate;
import java.util.UUID;

public record StockTransferItemResponse(
        UUID itemId,
        Integer medicineId,
        String medicineName,
        UUID batchId,
        String batchNumber,
        LocalDate expiryDate,
        Integer quantity,
        String notes
) {
    public static StockTransferItemResponse fromEntity(StockTransferItem item) {
        var m = item.getMedicine();
        var b = item.getBatch();
        return new StockTransferItemResponse(
                item.getItemId(),
                m != null ? m.getMedicineId() : null,
                m != null ? m.getMedicineName() : null,
                b != null ? b.getBatchId() : null,
                b != null ? b.getBatchNumber() : null,
                b != null ? b.getExpiryDate() : null,
                item.getQuantity(),
                item.getNotes()
        );
    }
}
