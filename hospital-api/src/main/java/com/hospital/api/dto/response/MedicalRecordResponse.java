package com.hospital.api.dto.response;

import com.hospital.api.constant.MedicalExamState;
import com.hospital.api.entity.MedicalExaminationRecord;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record MedicalRecordResponse(
        UUID recordId,
        String bookingCode,
        UUID patientProfileId,
        String patientName,
        UUID doctorId,
        String doctorName,
        String symptoms,
        String initialDiagnosis,
        String finalDiagnosis,
        String treatmentPlan,
        LocalDate reExaminationDate,
        MedicalExamState state,
        List<MedicalTestResponse> tests,
        List<MedicalObservationResponse> observations,
        List<MedicalConditionResponse> conditions,
        PrescriptionResponse prescription,
        java.time.LocalDateTime completedAt,
        Boolean isLocked,
        Integer addendumCount
) {
    public static MedicalRecordResponse fromEntity(MedicalExaminationRecord r) {
        return new MedicalRecordResponse(
                r.getRecordId(),
                r.getBooking() != null ? r.getBooking().getBookingCode() : null,
                r.getPatientProfile() != null ? r.getPatientProfile().getPatientProfileId() : null,
                r.getPatientProfile() != null ? r.getPatientProfile().getFullName() : "N/A",
                r.getDoctor() != null ? r.getDoctor().getDoctorId() : null,
                r.getDoctor() != null && r.getDoctor().getAccount() != null ? r.getDoctor().getAccount().getFullName() : "N/A",
                r.getSymptoms(),
                r.getInitialDiagnosis(),
                r.getFinalDiagnosis(),
                r.getTreatmentPlan(),
                r.getReExaminationDate(),
                r.getState(),
                r.getMedicalTests() != null ? r.getMedicalTests().stream().map(MedicalTestResponse::fromEntity).toList() : List.of(),
                r.getMedicalObservations() != null ? r.getMedicalObservations().stream().map(MedicalObservationResponse::fromEntity).toList() : List.of(),
                r.getMedicalConditions() != null ? r.getMedicalConditions().stream().map(MedicalConditionResponse::fromEntity).toList() : List.of(),
                r.getPrescription() != null ? PrescriptionResponse.fromEntity(r.getPrescription()) : null,
                r.getCompletedAt(),
                r.isLockedRecord(),
                r.getAddendums() != null ? r.getAddendums().size() : 0
        );
    }
}

