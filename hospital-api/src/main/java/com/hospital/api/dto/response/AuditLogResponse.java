package com.hospital.api.dto.response;

import com.hospital.api.entity.AuditLog;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

public record AuditLogResponse(
        UUID logId,
        UUID actorId,
        String actorName,
        String actorRole,
        String action,
        String entityType,
        String entityId,
        String ipAddress,
        String details,
        String createdAt
) {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy");

    public static AuditLogResponse fromEntity(AuditLog log) {
        String createdStr = log.getCreatedAt() != null
                ? log.getCreatedAt().atZone(ZoneId.systemDefault()).format(FORMATTER)
                : "N/A";

        return new AuditLogResponse(
                log.getLogId(),
                log.getActorId(),
                log.getActorName(),
                log.getActorRole(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getIpAddress(),
                log.getDetails(),
                createdStr
        );
    }
}
