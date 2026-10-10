package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record DischargeRequest(
        @NotBlank(message = "Tóm tắt bệnh án xuất viện không được để trống")
        String dischargeSummary,
        String doctorRecommendation,
        LocalDate reExaminationDate
) {}
