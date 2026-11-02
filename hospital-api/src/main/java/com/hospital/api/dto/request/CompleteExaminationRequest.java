package com.hospital.api.dto.request;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.hospital.api.common.FlexibleLocalDateDeserializer;
import java.time.LocalDate;
import java.util.List;

public record CompleteExaminationRequest(
        String finalDiagnosis,
        String treatmentPlan,
        String notes,
        @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
        LocalDate reExaminationDate,
        List<ConditionInputRequest> conditions,
        Boolean admitToInpatient
) {}

