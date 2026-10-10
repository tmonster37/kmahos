package com.hospital.api.dto.response;

import lombok.Builder;
import java.util.List;
import java.util.UUID;

@Builder
public record AiConsultationResponse(
        String replyText,
        String triageLevel,       // EMERGENCY, URGENT, ROUTINE, GENERAL_INFO
        String emergencyAlert,    // Cảnh báo khẩn cấp (nếu có)
        DepartmentInfo suggestedDepartment,
        List<DoctorSummary> suggestedDoctors,
        BookingAction bookingAction,
        List<CitationItem> medicalCitations
) {
    @Builder
    public record DepartmentInfo(
            Integer departmentId,
            String name,
            String description,
            String icon
    ) {}

    @Builder
    public record DoctorSummary(
            UUID doctorId,
            String fullName,
            String academicTitle,
            String specialty
    ) {}

    @Builder
    public record BookingAction(
            Integer departmentId,
            String departmentName,
            String symptoms,
            String actionUrl,
            String buttonLabel
    ) {}

    @Builder
    public record CitationItem(
            String title,
            String source,
            String url
    ) {}
}
