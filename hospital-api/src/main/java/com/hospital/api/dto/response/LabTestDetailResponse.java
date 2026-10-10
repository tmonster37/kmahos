package com.hospital.api.dto.response;

import com.hospital.api.constant.MedicalTestState;
import com.hospital.api.entity.MedicalTest;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

public record LabTestDetailResponse(
        UUID testId,
        String testCode,
        Integer serviceId,
        String serviceName,
        BigDecimal price,
        String testResult,
        String resultFileUrl,
        MedicalTestState state,
        UUID recordId,
        String bookingCode,
        String patientName,
        String patientPhone,
        String patientGender,
        String doctorName,
        String specimenType,
        String specimenBarcode,
        LocalDateTime sampleCollectedAt,
        String sampleCollectedByName,
        String performedByName,
        LocalDateTime completedAt,
        List<TestResultItemResponse> resultItems,
        Instant createdAt
) {
    public static LabTestDetailResponse fromEntity(MedicalTest t) {
        var record = t.getMedicalRecord();
        var patient = record != null ? record.getPatientProfile() : null;
        var doctor = record != null && record.getDoctor() != null && record.getDoctor().getAccount() != null
                ? record.getDoctor().getAccount().getFullName() : "N/A";
        var booking = record != null ? record.getBooking() : null;
        var collectedBy = t.getSampleCollectedBy() != null ? t.getSampleCollectedBy().getFullName() : null;
        var performedBy = t.getPerformedBy() != null ? t.getPerformedBy().getFullName() : null;

        List<TestResultItemResponse> items = t.getResultItems() != null
                ? t.getResultItems().stream().map(TestResultItemResponse::fromEntity).toList()
                : Collections.emptyList();

        return new LabTestDetailResponse(
                t.getMedicalTestId(),
                t.getTestCode(),
                t.getMedicalService() != null ? t.getMedicalService().getServiceId() : null,
                t.getMedicalService() != null ? t.getMedicalService().getServiceName() : "N/A",
                t.getPrice(),
                t.getTestResult(),
                t.getResultFileUrl(),
                t.getState(),
                record != null ? record.getRecordId() : null,
                booking != null ? booking.getBookingCode() : null,
                patient != null ? patient.getFullName() : "N/A",
                patient != null ? patient.getPhoneNumber() : "",
                patient != null && patient.getGender() != null ? patient.getGender().name() : "",
                doctor,
                t.getSpecimenType(),
                t.getSpecimenBarcode(),
                t.getSampleCollectedAt(),
                collectedBy,
                performedBy,
                t.getCompletedAt(),
                items,
                t.getCreatedAt()
        );
    }
}

