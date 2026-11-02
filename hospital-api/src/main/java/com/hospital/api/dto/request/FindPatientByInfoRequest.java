package com.hospital.api.dto.request;

import com.hospital.api.constant.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record FindPatientByInfoRequest(
        @NotBlank(message = "Họ và tên không được để trống")
        String fullName,

        @NotNull(message = "Ngày sinh không được để trống")
        LocalDate dateOfBirth,

        @NotNull(message = "Giới tính không được để trống")
        Gender gender,

        String identityNumber, // Số CCCD / CMND (tùy chọn)
        String province        // Tỉnh / Thành phố (tùy chọn)
) {
}
