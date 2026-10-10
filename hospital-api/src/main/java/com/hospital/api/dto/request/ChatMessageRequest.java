package com.hospital.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ChatMessageRequest(
        @NotNull(message = "ID người nhận không được để trống")
        UUID recipientId,

        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        String content,

        String messageType, // TEXT, IMAGE, PRESCRIPTION_LINK, APPOINTMENT_LINK

        String attachmentUrl
) {}
