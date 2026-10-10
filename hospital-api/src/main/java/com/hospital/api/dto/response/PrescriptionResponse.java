package com.hospital.api.dto.response;

import com.hospital.api.entity.Prescription;
import com.hospital.api.entity.PrescriptionItem;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PrescriptionResponse(
        UUID prescriptionId,
        String prescriptionCode,
        BigDecimal totalAmount,
        String doctorNotes,
        List<PrescriptionItemResponse> items
) {
    public static PrescriptionResponse fromEntity(Prescription p) {
        return new PrescriptionResponse(
                p.getPrescriptionId(),
                p.getPrescriptionCode(),
                p.getTotalAmount(),
                p.getDoctorNotes(),
                p.getPrescriptionItems().stream().map(PrescriptionItemResponse::fromEntity).toList()
        );
    }
}

record PrescriptionItemResponse(
        String medicineName,
        String unit,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        Float morningAmount,
        Float noonAmount,
        Float afternoonAmount,
        Float eveningAmount,
        String dosageInstruction
) {
    public static PrescriptionItemResponse fromEntity(PrescriptionItem item) {
        return new PrescriptionItemResponse(
                item.getMedicine().getMedicineName(),
                item.getMedicine().getUnit().name(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getTotalPrice(),
                item.getMorningAmount(),
                item.getNoonAmount(),
                item.getAfternoonAmount(),
                item.getEveningAmount(),
                item.getDosageInstruction()
        );
    }
}

