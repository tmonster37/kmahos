package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record KioskDispatchRequest(
        @NotBlank(message = "Họ tên bệnh nhân không được để trống")
        String fullName,

        @NotBlank(message = "Số điện thoại không được để trống")
        String phoneNumber,

        @NotNull(message = "Vui lòng chọn chuyên khoa")
        Integer departmentId,

        Integer birthYear,
        Boolean isPriority,
        String priorityReason,
        Boolean hasInsurance,
        String bookingCode, // Mã đặt hẹn nếu là check-in đặt trước
        @NotBlank(message = "Mã gửi yêu cầu không được để trống")
        @jakarta.validation.constraints.Size(max = 64, message = "Mã gửi yêu cầu tối đa 64 ký tự")
        String idempotencyKey
) {}
