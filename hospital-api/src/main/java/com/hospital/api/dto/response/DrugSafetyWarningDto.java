package com.hospital.api.dto.response;

import lombok.Builder;

@Builder
public record DrugSafetyWarningDto(
        Integer medicineId,
        String medicineName,
        String activeIngredient,
        String matchedAllergy,
        String warningLevel, // CRITICAL, WARNING
        String warningMessage
) {}
