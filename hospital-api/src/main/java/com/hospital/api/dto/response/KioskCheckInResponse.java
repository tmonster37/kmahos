package com.hospital.api.dto.response;

import com.hospital.api.constant.CheckInWindowStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record KioskCheckInResponse(
        UUID bookingId,
        String bookingCode,
        Integer queueNumber,
        String queueCode,
        String patientName,
        String patientPhone,
        String doctorName,
        String departmentName,
        String roomName,
        LocalDate bookingDate,
        String timeSlotRange,
        CheckInWindowStatus windowStatus,
        Boolean isPriority,
        String priorityReason,
        String message,
        LocalDateTime checkedInAt
) {
}
