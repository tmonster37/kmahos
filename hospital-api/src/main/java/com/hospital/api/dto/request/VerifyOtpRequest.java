package com.hospital.api.dto.request;

import com.hospital.api.constant.OtpPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record VerifyOtpRequest(
        @NotBlank(message = "Địa chỉ Email không được để trống")
        String email,

        @NotBlank(message = "Mã OTP không được để trống")
        String otpCode,

        @NotNull(message = "Mục đích xác thực mã OTP không được để trống")
        OtpPurpose purpose
) {}
