package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
        @NotBlank(message = "Google ID Token không được để trống")
        String idToken,

        String otpCode
) {}
