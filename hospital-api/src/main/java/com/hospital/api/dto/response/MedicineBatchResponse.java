package com.hospital.api.dto.response;

import com.hospital.api.constant.BatchStatus;
import com.hospital.api.entity.MedicineBatch;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record MedicineBatchResponse(
        UUID batchId,
        Integer medicineId,
        String medicineName,
        String batchNumber,
        LocalDate manufacturingDate,
        LocalDate expiryDate,
        BigDecimal purchasePrice,
        BigDecimal unitPrice,
        String manufacturer,
        BatchStatus status
) {
    public static MedicineBatchResponse fromEntity(MedicineBatch b) {
        return new MedicineBatchResponse(
                b.getBatchId(),
                b.getMedicine() != null ? b.getMedicine().getMedicineId() : null,
                b.getMedicine() != null ? b.getMedicine().getMedicineName() : null,
                b.getBatchNumber(),
                b.getManufacturingDate(),
                b.getExpiryDate(),
                b.getPurchasePrice(),
                b.getUnitPrice(),
                b.getManufacturer(),
                b.getStatus()
        );
    }
}
