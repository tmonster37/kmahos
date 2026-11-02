package com.hospital.api.dto.request;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.hospital.api.common.FlexibleLocalDateDeserializer;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public record DiagnosisRequest(
        @NotBlank(message = "Chẩn đoán xác định không được để trống")
        String finalDiagnosis,

        String treatmentPlan,

        @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
        LocalDate reExaminationDate,

        List<ConditionInputRequest> conditions
) {}

