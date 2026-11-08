package com.hospital.api.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.hospital.api.entity.Notification;

import java.time.Instant;
import java.util.UUID;

public record PatientNotificationResponse(
        UUID notificationId,
        String title,
        String content,
        String type,
        boolean isRead,
        Instant createdAt,
        Instant updatedAt
) {
    @JsonProperty("read")
    public boolean read() {
        return isRead;
    }

    public static PatientNotificationResponse fromEntity(Notification notification) {
        if (notification == null) return null;
        return new PatientNotificationResponse(
                notification.getNotificationId(),
                notification.getTitle(),
                notification.getContent(),
                notification.getType(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getUpdatedAt()
        );
    }
}

