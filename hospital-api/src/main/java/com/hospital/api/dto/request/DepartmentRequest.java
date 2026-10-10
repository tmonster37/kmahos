package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentRequest(
        @NotBlank(message = "Tên khoa không được để trống")
        @Size(max = 150, message = "Tên khoa tối đa 150 ký tự")
        String departmentName,

        String description,
        String thumbnailUrl
) {}

