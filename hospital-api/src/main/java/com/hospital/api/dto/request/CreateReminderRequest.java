package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record CreateReminderRequest(
        @NotNull(message = "Hồ sơ bệnh nhân không được để trống")
        UUID patientProfileId,

        @NotBlank(message = "Tên thuốc không được để trống")
        String medicineName,

        @NotNull(message = "Liều lượng không được để trống")
        Float dosage,

        @NotBlank(message = "Đơn vị không được để trống")
        String unit,

        @NotNull(message = "Giờ uống không được để trống")
        LocalTime reminderTime,

        @NotNull(message = "Ngày bắt đầu không được để trống")
        LocalDate startDate,

        @NotNull(message = "Ngày kết thúc không được để trống")
        LocalDate endDate,

        String instruction
) {}

