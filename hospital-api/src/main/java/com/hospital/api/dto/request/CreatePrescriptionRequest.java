package com.hospital.api.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreatePrescriptionRequest(
        @JsonAlias({"advice", "notes", "instruction"})
        String doctorNotes,

        @NotEmpty(message = "Đơn thuốc phải có ít nhất 1 loại thuốc")
        @Valid
        @JsonAlias({"details", "prescriptionItems"})
        List<PrescriptionItemRequest> items,

        @JsonAlias({"overrideAllergy", "forcePrescribe"})
        Boolean overrideAllergyWarning,

        @JsonAlias({"overrideReason", "clinicalJustification", "justification"})
        String overrideReason
) {}

