package com.hospital.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SaveObservationsRequest(
        @NotEmpty(message = "Danh sách chỉ số không được rỗng")
        List<@Valid ObservationInputRequest> observations
) {}
