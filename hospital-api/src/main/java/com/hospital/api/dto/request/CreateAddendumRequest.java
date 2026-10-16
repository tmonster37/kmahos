package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateAddendumRequest(
        @NotBlank(message = "Lý do lập phụ lục bệnh án không được để trống theo Thông tư 46/2018/TT-BYT")
        String reason,
        String updatedDiagnosis,
        String updatedTreatmentPlan,
        String clinicalNotes
) {}
