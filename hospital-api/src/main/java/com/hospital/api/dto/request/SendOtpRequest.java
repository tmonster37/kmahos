package com.hospital.api.dto.request;

import com.hospital.api.constant.OtpPurpose;
import jakarta.validation.constraints.NotNull;

public record SendOtpRequest(
        String email,

        String phoneNumber,

        @NotNull(message = "Mục đích yêu cầu mã OTP không được để trống")
        OtpPurpose purpose
) {
    public SendOtpRequest(String email, OtpPurpose purpose) {
        this(email, null, purpose);
    }
}
