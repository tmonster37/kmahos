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
        String bookingCode // Mã đặt hẹn nếu là check-in đặt trước
) {}
