package com.hospital.api.dto.response;

import com.hospital.api.entity.PrescriptionDispenseItem;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record DispenseItemResponse(
        UUID dispenseItemId,
        Integer medicineId,
        String medicineName,
        UUID batchId,
        String batchNumber,
        LocalDate expiryDate,
        Integer quantityDispensed,
        BigDecimal unitPrice,
        BigDecimal totalPrice
) {
    public static DispenseItemResponse fromEntity(PrescriptionDispenseItem item) {
        var m = item.getMedicine();
        return new DispenseItemResponse(
                item.getDispenseItemId(),
                m != null ? m.getMedicineId() : null,
                m != null ? m.getMedicineName() : null,
                item.getBatch() != null ? item.getBatch().getBatchId() : null,
                item.getBatchNumber(),
                item.getExpiryDate(),
                item.getQuantityDispensed(),
                item.getUnitPrice(),
                item.getTotalPrice()
        );
    }
}
