package com.hospital.api.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateRatingRequest(
        @NotNull(message = "Mã lượt khám không được để trống")
        UUID bookingId,

        @NotNull(message = "Số sao đánh giá không được để trống")
        @Min(value = 1, message = "Tối thiểu 1 sao")
        @Max(value = 5, message = "Tối đa 5 sao")
        Integer stars,

        String comment
) {}

