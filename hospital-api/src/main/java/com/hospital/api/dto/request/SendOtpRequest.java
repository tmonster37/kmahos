package com.hospital.api.dto.request;

import com.hospital.api.constant.OtpPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SendOtpRequest(
        @NotBlank(message = "Địa chỉ Email nhận mã OTP không được để trống")
        String email,

        @NotNull(message = "Mục đích yêu cầu mã OTP không được để trống")
        OtpPurpose purpose
) {}
