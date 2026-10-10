package com.hospital.api.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record AssignMedicalTestRequest(
        @NotEmpty(message = "Danh sách dịch vụ xét nghiệm không được để trống")
        @JsonAlias({"medicalServiceIds", "serviceIdList"})
        List<Integer> serviceIds
) {}

