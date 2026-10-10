package com.hospital.api.dto.request;

import com.hospital.api.constant.Degree;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record DoctorCreateRequest(
        @NotBlank(message = "Họ và tên bác sĩ không được để trống")
        String fullName,

        @NotBlank(message = "Số điện thoại không được để trống")
        String phoneNumber,

        String email,

        @NotBlank(message = "Mật khẩu không được để trống")
        String password,

        @NotNull(message = "Chuyên khoa không được để trống")
        Integer departmentId,

        @NotNull(message = "Học vị không được để trống")
        Degree degree,

        String biography,

        @Positive(message = "Giá khám phải lớn hơn 0")
        BigDecimal consultationFee
) {}
