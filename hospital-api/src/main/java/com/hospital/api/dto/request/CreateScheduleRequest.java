package com.hospital.api.dto.request;

import com.hospital.api.constant.ScheduleSession;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record CreateScheduleRequest(
        @NotNull(message = "Bác sĩ không được để trống")
        UUID doctorId,

        @NotNull(message = "Phòng khám không được để trống")
        Integer roomId,

        @NotNull(message = "Ngày trực không được để trống")
        LocalDate scheduleDate,

        @NotNull(message = "Buổi trực không được để trống")
        ScheduleSession session
) {}

