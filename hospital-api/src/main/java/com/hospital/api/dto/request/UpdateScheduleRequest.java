package com.hospital.api.dto.request;

import com.hospital.api.constant.ScheduleSession;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateScheduleRequest(
        @NotNull(message = "Bác sĩ không được để trống")
        UUID doctorId,

        @NotNull(message = "Phòng khám không được để trống")
        Integer roomId,

        @NotNull(message = "Ngày trực không được để trống")
        LocalDate scheduleDate,

        @NotNull(message = "Buổi trực không được để trống")
        ScheduleSession session,

        @Min(value = 1, message = "Số lượng tối đa đặt khám online phải từ 1 trở lên")
        Integer maxCapacityPerSlot
) {}
