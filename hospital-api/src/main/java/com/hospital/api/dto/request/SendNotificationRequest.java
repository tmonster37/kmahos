package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record SendNotificationRequest(
        String bookingCode,
        String phoneNumber,
        UUID accountId,
        @NotBlank(message = "Tiêu đề không được để trống")
        String title,
        @NotBlank(message = "Nội dung không được để trống")
        String content,
        String type
) {}
