package com.hospital.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PharmacyPrescriptionResponse(
        UUID prescriptionId,
        String prescriptionCode,
        String bookingCode,
        String patientName,
        String patientPhone,
        String identityNumber,
        String gender,
        String doctorName,
        String departmentName,
        String diagnosis,
        BigDecimal totalAmount,
        String doctorNotes,
        boolean isPaid,
        boolean isDispensed,
        String dispenseCode,
        LocalDateTime prescribedAt,
        List<PrescriptionItemDetail> items
) {
    public record PrescriptionItemDetail(
            Integer medicineId,
            String medicineName,
            String activeIngredient,
            String unit,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal totalPrice,
            Float morningAmount,
            Float noonAmount,
            Float afternoonAmount,
            Float eveningAmount,
            String dosageInstruction
    ) {}
}
