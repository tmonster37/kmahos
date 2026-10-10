package com.hospital.api.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record DailyRecordRequest(
        String temperature,
        String bloodPressure,
        @JsonAlias({"heartRate", "pulse"})
        String heartRate,
        @NotBlank(message = "Diễn tiến bệnh không được để trống")
        @JsonAlias({"diseaseProgression", "progressNotes", "notes"})
        String diseaseProgression,
        @JsonAlias({"doctorInstruction", "doctorOrders", "orders"})
        String doctorInstruction
) {}

