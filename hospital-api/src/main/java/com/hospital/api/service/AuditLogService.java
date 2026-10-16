package com.hospital.api.service;

import com.hospital.api.dto.response.AuditLogResponse;

import java.util.List;
import java.util.UUID;

public interface AuditLogService {
    void log(UUID actorId, String actorName, String actorRole, String action, String entityType, String entityId, String details, String ipAddress);
    List<AuditLogResponse> getRecentAuditLogs(String action, int limit);
}
