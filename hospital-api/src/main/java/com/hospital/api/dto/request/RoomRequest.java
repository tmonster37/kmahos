package com.hospital.api.dto.request;

import com.hospital.api.constant.RoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RoomRequest(
        @NotBlank(message = "Tên phòng không được để trống")
        String roomName,

        String description,

        @NotNull(message = "Loại phòng không được để trống")
        RoomType roomType,

        Integer capacity,

        @NotNull(message = "Mã khoa không được để trống")
        Integer departmentId
) {}

