package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record KioskPayRequest(
        @NotBlank(message = "Mã đặt khám không được để trống")
        String bookingCode,

        String paymentMethod
) {}
