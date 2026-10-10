package com.hospital.api.dto.request;

import com.hospital.api.constant.CareLevel;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record DoctorOrderRequest(
        LocalDate orderDate,

        @NotBlank(message = "Diễn biến bệnh lý không được để trống")
        String diseaseProgression,

        @NotBlank(message = "Y lệnh điều trị không được để trống")
        String doctorInstruction,

        String dietaryDiet,
        CareLevel careLevel
) {}
