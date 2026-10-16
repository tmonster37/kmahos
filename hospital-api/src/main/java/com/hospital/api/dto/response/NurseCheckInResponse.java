package com.hospital.api.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record NurseCheckInResponse(
        UUID bookingId,
        String bookingCode,
        Integer queueNumber,
        String patientName,
        String gender,
        Integer birthYear,
        String departmentName,
        String roomName,
        String doctorName,
        BigDecimal bmi,
        String bmiCategory,
        String checkInTime,
        String status,
        String message
) {}
