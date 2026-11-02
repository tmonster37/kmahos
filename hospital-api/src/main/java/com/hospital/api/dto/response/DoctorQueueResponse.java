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

    /**
     * Phương thức bảo vệ quyền riêng tư bệnh nhân cho màn hình TV công khai ngoài sảnh chờ
     */
    public static DoctorQueueResponse toPublicEntity(Booking b, MedicalExaminationRecord record) {
        DoctorQueueResponse full = fromEntity(b, record);
        String maskedName = maskName(full.patientName());
        String maskedPhone = maskPhone(full.patientPhone());

        return new DoctorQueueResponse(
                null, // Ẩn bookingId
                full.bookingCode(),
                full.queueNumber(),
                full.queueCode(),
                full.isPriority(),
                null, // Ẩn lý do ưu tiên
                full.bookingDate(),
                full.timeSlotRange(),
                null, // Ẩn ID hồ sơ bệnh nhân
                maskedName,
                maskedPhone,
                full.patientGender(),
                null, // Ẩn ngày sinh chi tiết
                null, // Ẩn triệu chứng bệnh lý
                full.status(),
                null, // Ẩn recordId
                full.recordState(),
                full.totalTests(),
                full.completedTests(),
                full.isReturnAfterResult()
        );
    }

    private static String maskName(String name) {
        if (name == null || name.isBlank() || "N/A".equals(name)) return "Bệnh nhân";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            String p = parts[0];
            return p.length() <= 2 ? p : p.charAt(0) + "***" + p.charAt(p.length() - 1);
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i == 0 || i == parts.length - 1) {
                sb.append(parts[i]);
            } else {
                sb.append("***");
            }
            if (i < parts.length - 1) sb.append(" ");
        }
        return sb.toString();
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return "";
        if (phone.length() < 7) return "***";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 3);
    }
}
