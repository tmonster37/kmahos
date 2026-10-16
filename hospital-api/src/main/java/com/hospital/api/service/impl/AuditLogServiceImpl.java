package com.hospital.api.service.impl;

import com.hospital.api.dto.response.AuditLogResponse;
import com.hospital.api.entity.AuditLog;
import com.hospital.api.repository.AuditLogRepository;
import com.hospital.api.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    private static final Pattern PII_PASSWORD_PATTERN = Pattern.compile("(?i)(password|pwd|pass|secret|otp|token)\\s*[:=]\\s*[\"']?([^\"'\\s,]+)[\"']?");

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(UUID actorId, String actorName, String actorRole, String action, String entityType, String entityId, String details, String ipAddress) {
        try {
            String sanitized = sanitizeDetails(details);
            AuditLog auditLog = AuditLog.builder()
                    .actorId(actorId)
                    .actorName(actorName != null ? actorName : "Hệ Thống")
                    .actorRole(actorRole != null ? actorRole : "SYSTEM")
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                    .details(sanitized)
                    .build();

            auditLogRepository.save(auditLog);
            log.info("Audit Log ghi nhận thành công: [{}] bởi {} ({})", action, actorName, actorRole);
        } catch (Exception e) {
            log.error("Không thể ghi nhận Audit Log cho hành động {}: {}", action, e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLogResponse> getRecentAuditLogs(String action, int limit) {
        List<AuditLog> list;
        if (action != null && !action.isBlank()) {
            list = auditLogRepository.findAllByActionOrderByCreatedAtDesc(action);
        } else {
            list = auditLogRepository.findAllByOrderByCreatedAtDesc();
        }

        int max = limit > 0 ? Math.min(limit, 100) : 50;
        return list.stream()
                .limit(max)
                .map(AuditLogResponse::fromEntity)
                .collect(Collectors.toList());
    }

    private String sanitizeDetails(String input) {
        if (input == null || input.isBlank()) return "";
        // Sanitize password, token, secret
        return PII_PASSWORD_PATTERN.matcher(input).replaceAll("$1=***MASKED***");
    }
}
