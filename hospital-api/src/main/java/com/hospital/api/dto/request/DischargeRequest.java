package com.hospital.api.dto.request;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.hospital.api.common.FlexibleLocalDateDeserializer;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record DischargeRequest(
        @NotBlank(message = "Tóm tắt bệnh án xuất viện không được để trống")
        String dischargeSummary,
        String doctorRecommendation,
        @JsonDeserialize(using = FlexibleLocalDateDeserializer.class)
        LocalDate reExaminationDate
) {}

