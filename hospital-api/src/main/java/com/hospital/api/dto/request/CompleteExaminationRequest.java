package com.hospital.api.dto.request;

import java.time.LocalDate;
import java.util.List;

public record CompleteExaminationRequest(
        String finalDiagnosis,
        String treatmentPlan,
        String notes,
        LocalDate reExaminationDate,
        List<ConditionInputRequest> conditions,
        Boolean admitToInpatient
) {}
