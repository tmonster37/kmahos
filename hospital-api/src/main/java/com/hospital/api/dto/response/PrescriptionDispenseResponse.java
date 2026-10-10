package com.hospital.api.dto.response;

import com.hospital.api.constant.DispenseStatus;
import com.hospital.api.entity.PrescriptionDispense;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record PrescriptionDispenseResponse(
        UUID dispenseId,
        String dispenseCode,
        UUID prescriptionId,
        String prescriptionCode,
        String patientName,
        String patientPhone,
        UUID warehouseId,
        String warehouseName,
        DispenseStatus status,
        String dispensedByName,
        LocalDateTime dispensedAt,
        String notes,
        BigDecimal totalAmount,
        List<DispenseItemResponse> items
) {
    public static PrescriptionDispenseResponse fromEntity(PrescriptionDispense d) {
        var p = d.getPrescription();
        var record = p != null ? p.getMedicalRecord() : null;
        var patient = record != null ? record.getPatientProfile() : null;
        var w = d.getWarehouse();

        List<DispenseItemResponse> itemList = d.getItems() != null
                ? d.getItems().stream().map(DispenseItemResponse::fromEntity).toList()
                : Collections.emptyList();

        BigDecimal sum = itemList.stream()
                .map(DispenseItemResponse::totalPrice)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new PrescriptionDispenseResponse(
                d.getDispenseId(),
                d.getDispenseCode(),
                p != null ? p.getPrescriptionId() : null,
                p != null ? p.getPrescriptionCode() : null,
                patient != null ? patient.getFullName() : "N/A",
                patient != null ? patient.getPhoneNumber() : "",
                w != null ? w.getWarehouseId() : null,
                w != null ? w.getWarehouseName() : null,
                d.getStatus(),
                d.getDispensedBy() != null ? d.getDispensedBy().getFullName() : null,
                d.getDispensedAt(),
                d.getNotes(),
                sum,
                itemList
        );
    }
}
