package com.hospital.api.dto.response;

import com.hospital.api.entity.MedicalRecordAddendum;

import java.time.Instant;
import java.util.UUID;

public record AddendumResponse(
        UUID addendumId,
        UUID recordId,
        UUID doctorId,
        String doctorName,
        String reason,
        String previousDiagnosis,
        String updatedDiagnosis,
        String previousTreatmentPlan,
        String updatedTreatmentPlan,
        String clinicalNotes,
        Instant createdAt
) {
    public static AddendumResponse fromEntity(MedicalRecordAddendum a) {
        String docName = a.getDoctor() != null && a.getDoctor().getAccount() != null
                ? a.getDoctor().getAccount().getFullName()
                : "Bác sĩ";
        return new AddendumResponse(
                a.getAddendumId(),
                a.getMedicalRecord() != null ? a.getMedicalRecord().getRecordId() : null,
                a.getDoctor() != null ? a.getDoctor().getDoctorId() : null,
                docName,
                a.getReason(),
                a.getPreviousDiagnosis(),
                a.getUpdatedDiagnosis(),
                a.getPreviousTreatmentPlan(),
                a.getUpdatedTreatmentPlan(),
                a.getClinicalNotes(),
                a.getCreatedAt()
        );
    }
}
