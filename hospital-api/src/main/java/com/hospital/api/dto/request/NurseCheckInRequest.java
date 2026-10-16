package com.hospital.api.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

public record NurseCheckInRequest(
        String qrData,
        String bookingCode,
        BigDecimal weight,
        BigDecimal height,
        String bloodPressure,
        BigDecimal temperature,
        Integer heartRate,
        Integer spo2,
        String nurseNotes,
        UUID roomId
) {}
