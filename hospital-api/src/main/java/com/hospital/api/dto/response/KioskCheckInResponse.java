package com.hospital.api.dto.response;

import com.hospital.api.constant.CheckInWindowStatus;

import java.math.BigDecimal;
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
        LocalDateTime checkedInAt,
        Boolean isPaid,
        BigDecimal price,
        LocalDateTime dispatchedAt
) {
    public KioskCheckInResponse(
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
        this(bookingId, bookingCode, queueNumber, queueCode, patientName, patientPhone, doctorName, departmentName,
                roomName, bookingDate, timeSlotRange, windowStatus, isPriority, priorityReason, message, checkedInAt,
                false, BigDecimal.ZERO, null);
    }
}
