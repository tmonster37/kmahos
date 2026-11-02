package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record KioskBookingRequest(
        @NotBlank(message = "Họ và tên không được để trống")
        String fullName,

        @NotBlank(message = "Số điện thoại không được để trống")
        String phoneNumber,

        @NotNull(message = "Vui lòng chọn chuyên khoa khám")
        Integer departmentId,

        Integer birthYear,

        Boolean isPriority,

        String priorityReason,

        String symptoms,

        Boolean payNow
) {
    public KioskBookingRequest(String fullName, String phoneNumber, Integer departmentId, Integer birthYear, Boolean isPriority, String priorityReason, String symptoms) {
        this(fullName, phoneNumber, departmentId, birthYear, isPriority, priorityReason, symptoms, false);
    }
}
