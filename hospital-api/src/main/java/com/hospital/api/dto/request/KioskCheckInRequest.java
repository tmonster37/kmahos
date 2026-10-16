package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record KioskCheckInRequest(
        @NotBlank(message = "Mã đặt khám hoặc số điện thoại không được để trống")
        String bookingCodeOrPhone
) {
}
