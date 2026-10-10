package com.hospital.api.dto.response;

import com.hospital.api.constant.CareLevel;
import com.hospital.api.entity.InpatientNursingCare;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record NursingCareResponse(
        UUID careId,
        UUID admissionId,
        UUID nurseId,
        String nurseName,
        Instant careTime,
        BigDecimal temperature,
        String bloodPressure,
        Integer pulse,
        Integer respiratoryRate,
        Integer spo2,
        CareLevel careLevel,
        String nursingNote,
        String medicationAdministered
) {
    public static NursingCareResponse fromEntity(InpatientNursingCare c) {
        return new NursingCareResponse(
                c.getCareId(),
                c.getHospitalAdmission() != null ? c.getHospitalAdmission().getAdmissionId() : null,
                c.getNurse() != null ? c.getNurse().getStaffId() : null,
                c.getNurse() != null ? c.getNurse().getFullName() : "Điều dưỡng ca trực",
                c.getCareTime(),
                c.getTemperature(),
                c.getBloodPressure(),
                c.getPulse(),
                c.getRespiratoryRate(),
                c.getSpo2(),
                c.getCareLevel(),
                c.getNursingNote(),
                c.getMedicationAdministered()
        );
    }
}
