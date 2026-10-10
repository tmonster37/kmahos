package com.hospital.api.dto.response;

import com.hospital.api.constant.BatchStatus;
import com.hospital.api.entity.MedicineBatch;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public record ExpiryAlertResponse(
        UUID batchId,
        Integer medicineId,
        String medicineName,
        String batchNumber,
        LocalDate expiryDate,
        long daysUntilExpiry,
        BatchStatus status,
        String manufacturer
) {
    public static ExpiryAlertResponse fromEntity(MedicineBatch b, LocalDate today) {
        long days = ChronoUnit.DAYS.between(today, b.getExpiryDate());
        return new ExpiryAlertResponse(
                b.getBatchId(),
                b.getMedicine() != null ? b.getMedicine().getMedicineId() : null,
                b.getMedicine() != null ? b.getMedicine().getMedicineName() : null,
                b.getBatchNumber(),
                b.getExpiryDate(),
                days,
                b.getStatus(),
                b.getManufacturer()
        );
    }
}
