package com.hospital.api.dto.response;

import com.hospital.api.constant.CareLevel;
import com.hospital.api.entity.InpatientDoctorOrder;

import java.time.LocalDate;
import java.util.UUID;

public record DoctorOrderResponse(
        UUID orderId,
        UUID admissionId,
        UUID doctorId,
        String doctorName,
        LocalDate orderDate,
        String diseaseProgression,
        String doctorInstruction,
        String dietaryDiet,
        CareLevel careLevel
) {
    public static DoctorOrderResponse fromEntity(InpatientDoctorOrder o) {
        return new DoctorOrderResponse(
                o.getOrderId(),
                o.getHospitalAdmission() != null ? o.getHospitalAdmission().getAdmissionId() : null,
                o.getDoctor() != null ? o.getDoctor().getDoctorId() : null,
                o.getDoctor() != null && o.getDoctor().getAccount() != null ? o.getDoctor().getAccount().getFullName() : "N/A",
                o.getOrderDate(),
                o.getDiseaseProgression(),
                o.getDoctorInstruction(),
                o.getDietaryDiet(),
                o.getCareLevel()
        );
    }
}
