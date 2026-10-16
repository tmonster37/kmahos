package com.hospital.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CheckPrescriptionSafetyRequest(
        @NotEmpty(message = "Danh sách thuốc không được để trống")
        @Valid
        List<PrescriptionItemRequest> items,
        String patientAllergies
) {}
