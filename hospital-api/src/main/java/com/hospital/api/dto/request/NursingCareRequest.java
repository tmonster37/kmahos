package com.hospital.api.dto.request;

import com.hospital.api.constant.CareLevel;
import java.math.BigDecimal;
import java.time.Instant;

public record NursingCareRequest(
        Instant careTime,
        BigDecimal temperature,
        String bloodPressure,
        Integer pulse,
        Integer respiratoryRate,
        Integer spo2,
        CareLevel careLevel,
        String nursingNote,
        String medicationAdministered
) {}
