package com.hospital.api.dto.response;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.MedicalExamState;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.MedicalExaminationRecord;

import java.time.LocalDate;
import java.util.UUID;

public record DoctorQueueResponse(
        UUID bookingId,
        String bookingCode,
        Integer queueNumber,
        String queueCode,
        Boolean isPriority,
        String priorityReason,
        LocalDate bookingDate,
        String timeSlotRange,
        UUID patientProfileId,
        String patientName,
        String patientPhone,
        String patientGender,
        LocalDate patientDob,
        String symptoms,
        BookingStatus status,
        UUID recordId,
        MedicalExamState recordState,
        Integer totalTests,
        Integer completedTests,
        Boolean isReturnAfterResult
) {
    public static DoctorQueueResponse fromEntity(Booking b, MedicalExaminationRecord record) {
        boolean priority = Boolean.TRUE.equals(b.getIsPriority());
        boolean isReturnAfterResult = record != null && record.getState() == MedicalExamState.DIAGNOSING;
        String prefix = isReturnAfterResult ? "KQ-" : (priority ? "UT-" : "KB-");
        String qCode = prefix + String.format("%02d", b.getQueueNumber() != null ? b.getQueueNumber() : 1);

        return new DoctorQueueResponse(
                b.getBookingId(),
                b.getBookingCode(),
                b.getQueueNumber(),
                qCode,
                priority,
                b.getPriorityReason(),
                b.getBookingDate(),
                b.getTimeSlot() != null ? (b.getTimeSlot().getStartTime() + " - " + b.getTimeSlot().getEndTime()) : "",
                b.getPatientProfile() != null ? b.getPatientProfile().getPatientProfileId() : null,
                b.getPatientProfile() != null ? b.getPatientProfile().getFullName() : "N/A",
                b.getPatientProfile() != null ? b.getPatientProfile().getPhoneNumber() : "",
                b.getPatientProfile() != null && b.getPatientProfile().getGender() != null ? b.getPatientProfile().getGender().name() : "",
                b.getPatientProfile() != null ? b.getPatientProfile().getDateOfBirth() : null,
                b.getSymptoms(),
                b.getStatus(),
                record != null ? record.getRecordId() : null,
                record != null ? record.getState() : null,
                record != null && record.getMedicalTests() != null ? record.getMedicalTests().size() : 0,
                record != null && record.getMedicalTests() != null ?
                        (int) record.getMedicalTests().stream().filter(t -> t.getState() != null && t.getState().name().equals("COMPLETED")).count() : 0,
                isReturnAfterResult
        );
    }
}
