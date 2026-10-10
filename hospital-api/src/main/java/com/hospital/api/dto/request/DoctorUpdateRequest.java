package com.hospital.api.dto.request;

import com.hospital.api.constant.Degree;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record DoctorUpdateRequest(
        @NotBlank(message = "Họ và tên bác sĩ không được để trống")
        String fullName,

        String phoneNumber,

        String email,

        String password,

        @NotNull(message = "Chuyên khoa không được để trống")
        Integer departmentId,

        @NotNull(message = "Học vị không được để trống")
        Degree degree,

        String biography,

        @Positive(message = "Giá khám phải lớn hơn 0")
        BigDecimal consultationFee
) {}
