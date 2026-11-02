package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record NurseWalkInReceptionRequest(
        @NotBlank(message = "Họ và tên không được để trống")
        String fullName,

        @NotBlank(message = "Số điện thoại không được để trống")
        String phoneNumber,

        String identityNumber,

        String gender,

        LocalDate dateOfBirth,

        String address,

        @NotNull(message = "Vui lòng chọn chuyên khoa khám")
        Integer departmentId,

        String symptoms,

        Boolean isPriority,

        String priorityReason,

        Boolean hasInsurance,

        Integer counterId,

        BigDecimal height,

        BigDecimal weight,

        String bloodPressure,

        Integer heartRate,

        BigDecimal temperature,

        Integer spo2,

        String nurseNotes,

        String idempotencyKey
) {}

