package com.hospital.api.dto.request;

import com.hospital.api.constant.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.time.LocalDate;

public record PatientProfileRequest(
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,

        String phoneNumber,
        String identityNumber,
        String healthInsuranceNumber,

        @NotNull(message = "Giới tính không được để trống")
        Gender gender,

        @NotNull(message = "Ngày sinh không được để trống")
        @Past(message = "Ngày sinh phải trong quá khứ")
        LocalDate dateOfBirth,

        String streetAddress,
        String province,
        String district,
        String ward
) {}

