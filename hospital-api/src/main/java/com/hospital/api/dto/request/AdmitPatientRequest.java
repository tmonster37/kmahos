package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AdmitPatientRequest(
        @NotNull(message = "Hồ sơ bệnh nhân không được để trống")
        UUID patientProfileId,

        @NotNull(message = "Phòng nội trú không được để trống")
        Integer roomId,

        @NotNull(message = "Bác sĩ điều trị không được để trống")
        UUID doctorId,

        @NotBlank(message = "Chẩn đoán ban đầu khi nhập viện không được để trống")
        String initialDiagnosis,

        UUID bedId // Mã giường cụ thể (Tùy chọn, nếu không gửi hệ thống tự gán giường trống đầu tiên)
) {}

