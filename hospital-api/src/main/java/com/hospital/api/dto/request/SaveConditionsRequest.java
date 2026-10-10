package com.hospital.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SaveConditionsRequest(
        @NotEmpty(message = "Danh sách chẩn đoán không được rỗng")
        List<@Valid ConditionInputRequest> conditions
) {}
