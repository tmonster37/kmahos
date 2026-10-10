package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public record DiagnosisRequest(
        @NotBlank(message = "Chẩn đoán xác định không được để trống")
        String finalDiagnosis,

        String treatmentPlan,
        LocalDate reExaminationDate,
        List<ConditionInputRequest> conditions
) {}
