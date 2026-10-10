package com.hospital.api.dto.request;

import com.hospital.api.constant.ConditionType;
import jakarta.validation.constraints.NotBlank;

public record ConditionInputRequest(
        @NotBlank(message = "Mã ICD-10 không được để trống")
        String icd10Code,

        @NotBlank(message = "Tên chẩn đoán không được để trống")
        String diseaseName,

        ConditionType conditionType,
        String clinicalStatus,
        String notes
) {}
